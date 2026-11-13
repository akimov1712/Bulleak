/** /ai/* — the AI gateway for signed-in learners (docs/04-features/ai-platform.md). */
import { Hono, type Context } from 'hono';
import { streamSSE } from 'hono/streaming';
import {
  AI_STREAM_EVENTS,
  aiChatBodySchema,
  type AiChatBody,
  type AiChatResponse,
  type AiSource,
  type AiStatus,
  type AiStreamDone,
  type CourseChunk,
} from '@bulleak/shared';
import type { Config } from '../config';
import type { Db } from '../db';
import { HttpError } from '../errors';
import { parseBody, type AuthedEnv } from '../http';
import type { Logger } from '../log';
import { requireAuth } from '../auth/routes';
import { pickExcerpts, systemPrompt } from './prompt';
import { ProviderError, type ChatProvider, type ChatRequest, type ChatUsage } from './provider';
import { decideQuota, readQuotaState, recordUsage } from './quota';
import { createCourseSearch, type CourseSearch } from './retrieval';

export interface AiDeps {
  config: Config;
  db: Db;
  logger: Logger;
  /** Null — AI is off (no key configured). */
  provider: ChatProvider | null;
  /** Course index for excerpts; empty by default. */
  course?: CourseSearch;
  now?: () => Date;
}

const unavailable = () =>
  new HttpError(503, 'ai_unavailable', 'Помощник сейчас недоступен. Попробуй позже.');

/** Search text: the question and the one before it, so follow-ups like «а почему?» still find the topic. */
export function searchQuery(messages: AiChatBody['messages']): string {
  return messages
    .filter((m) => m.role === 'user')
    .slice(-2)
    .map((m) => m.content)
    .join('\n');
}

/** One link per lesson, term or cheat sheet, in the order of the excerpts. */
export function sourcesOf(excerpts: readonly CourseChunk[]): AiSource[] {
  const seen = new Set<string>();
  const out: AiSource[] = [];
  for (const c of excerpts) {
    const key = `${c.kind}:${c.ref}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind: c.kind, ref: c.ref, title: linkTitle(c.title) });
  }
  return out;
}

/**
 * Short link text: the lesson without its section, the term without «Термин:» and aliases,
 * the cheat sheet without its section. Section titles contain « — ».
 */
export function linkTitle(title: string): string {
  const head = title.split(' — ')[0] ?? title;
  return head
    .replace(/^Термин:\s*/, '')
    .replace(/\s*\([^)]*\)$/, '')
    .replace(/^Шпаргалка\s+/, '');
}

/** Rough token count of a cut-off answer (no usage from the model): ~3 characters a token. */
export function estimateUsage(request: ChatRequest, answer: string): ChatUsage {
  const input = request.system.length + request.messages.reduce((n, m) => n + m.content.length, 0);
  return { inputTokens: Math.ceil(input / 3), outputTokens: Math.ceil(answer.length / 3) };
}

export function aiRoutes({
  config,
  db,
  logger,
  provider,
  course = createCourseSearch([]),
  now = () => new Date(),
}: AiDeps) {
  const app = new Hono<AuthedEnv>();
  const limits = config.ai.limits;
  app.use('/ai/*', requireAuth(config.jwtSecret));

  app.get('/ai/status', async (c) => {
    const state = await readQuotaState(db, c.get('userId'), now());
    const decision = decideQuota(state, limits);
    const body: AiStatus = {
      enabled: provider !== null && (decision.allowed || decision.reason !== 'monthly'),
      remaining: decision.allowed ? decision.remaining + 1 : decision.remaining,
    };
    c.header('Cache-Control', 'no-store');
    return c.json(body);
  });

  /** Everything before the model call: auth, validation, quota, excerpts. Throws HTTP errors. */
  async function prepare(c: Context<AuthedEnv>) {
    if (!provider) throw unavailable();
    const body = await parseBody(c, aiChatBodySchema);
    const userId = c.get('userId');
    const at = now();
    const decision = decideQuota(await readQuotaState(db, userId, at), limits);
    if (!decision.allowed) {
      throw new HttpError(
        429,
        'ai_quota',
        decision.reason === 'daily'
          ? `На сегодня вопросы закончились (${limits.dailyRequests} в день). Возвращайся завтра.`
          : 'Помощник в этом месяце исчерпал лимит. Он снова заработает с 1-го числа.',
      );
    }
    const excerpts = pickExcerpts(course.search(searchQuery(body.messages), 6).map((h) => h.chunk));
    const request: ChatRequest = {
      model: body.purpose === 'review' ? config.ai.models.review : config.ai.models.chat,
      system: systemPrompt(body.purpose, excerpts),
      messages: body.messages,
      maxTokens: body.purpose === 'review' ? 900 : 600,
    };
    return { provider, userId, at, request, remaining: decision.remaining, excerpts };
  }

  const logFailure = (name: string, error: ProviderError) =>
    logger.error('ai provider failed', { provider: name, reason: error.message });

  app.post('/ai/chat', async (c) => {
    const job = await prepare(c);
    try {
      const result = await job.provider.complete(job.request);
      await recordUsage(db, job.userId, job.at, result.usage);
      const answer: AiChatResponse = {
        text: result.text,
        remaining: job.remaining,
        sources: sourcesOf(job.excerpts),
      };
      c.header('Cache-Control', 'no-store');
      return c.json(answer);
    } catch (error) {
      if (error instanceof ProviderError) {
        logFailure(job.provider.name, error);
        throw unavailable();
      }
      throw error;
    }
  });

  // T-2102: the same answer as server-sent events. Errors before the first byte are plain JSON.
  app.post('/ai/chat/stream', async (c) => {
    const job = await prepare(c);
    c.header('Cache-Control', 'no-store');
    // nginx must pass pieces through at once instead of buffering the whole answer.
    c.header('X-Accel-Buffering', 'no');
    return streamSSE(c, async (stream) => {
      const abort = new AbortController();
      stream.onAbort(() => abort.abort());
      let sent = '';
      try {
        const result = await job.provider.stream(job.request, {
          signal: abort.signal,
          onDelta: (text) => {
            sent += text;
            void stream.writeSSE({ event: AI_STREAM_EVENTS.delta, data: JSON.stringify({ text }) });
          },
        });
        await recordUsage(db, job.userId, job.at, result.usage);
        const done: AiStreamDone = { remaining: job.remaining, sources: sourcesOf(job.excerpts) };
        await stream.writeSSE({ event: AI_STREAM_EVENTS.done, data: JSON.stringify(done) });
      } catch (error) {
        if (!(error instanceof ProviderError)) throw error;
        // A cut-off answer still counts: the model already worked on it.
        await recordUsage(db, job.userId, job.at, estimateUsage(job.request, sent));
        if (abort.signal.aborted) return;
        logFailure(job.provider.name, error);
        const e = unavailable();
        await stream.writeSSE({
          event: AI_STREAM_EVENTS.error,
          data: JSON.stringify({ code: e.code, message: e.message }),
        });
      }
    });
  });

  return app;
}
