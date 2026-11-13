/** /ai/* — the AI gateway for signed-in learners (docs/04-features/ai-platform.md). */
import { Hono } from 'hono';
import {
  aiChatBodySchema,
  type AiChatBody,
  type AiChatResponse,
  type AiSource,
  type AiStatus,
  type CourseChunk,
} from '@bulleak/shared';
import type { Config } from '../config';
import type { Db } from '../db';
import { HttpError } from '../errors';
import { parseBody, type AuthedEnv } from '../http';
import type { Logger } from '../log';
import { requireAuth } from '../auth/routes';
import { pickExcerpts, systemPrompt } from './prompt';
import { ProviderError, type ChatProvider } from './provider';
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
    out.push({ kind: c.kind, ref: c.ref, title: c.title.split(' — ')[0] ?? c.title });
  }
  return out;
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

  app.post('/ai/chat', async (c) => {
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
    try {
      const result = await provider.complete({
        model: body.purpose === 'review' ? config.ai.models.review : config.ai.models.chat,
        system: systemPrompt(body.purpose, excerpts),
        messages: body.messages,
        maxTokens: body.purpose === 'review' ? 900 : 600,
      });
      await recordUsage(db, userId, at, result.usage);
      const answer: AiChatResponse = {
        text: result.text,
        remaining: decision.remaining,
        sources: sourcesOf(excerpts),
      };
      c.header('Cache-Control', 'no-store');
      return c.json(answer);
    } catch (error) {
      if (error instanceof ProviderError) {
        logger.error('ai provider failed', { provider: provider.name, reason: error.message });
        throw unavailable();
      }
      throw error;
    }
  });

  return app;
}
