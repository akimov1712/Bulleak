import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  aiChatResponseSchema,
  aiStatusSchema,
  apiErrorSchema,
  authResponseSchema,
  type CourseChunk,
} from '@bulleak/shared';
import { API_PREFIX, createApp } from '../app';
import { loadConfig } from '../config';
import { openTestDatabase, type Database } from '../db';
import { aiUsage, users } from '../db/schema';
import { memoryLogger } from '../log';
import { memoryMailer } from '../mail';
import { pickExcerpts, systemPrompt } from './prompt';
import {
  createCourseSearch,
  loadCourseSearch,
  stem,
  tokenize,
  type CourseSearch,
} from './retrieval';
import { searchQuery, sourcesOf } from './routes';
import { deepseekProvider, mockProvider, ProviderError, type ChatProvider } from './provider';
import { decideQuota } from './quota';

describe('decideQuota', () => {
  const limits = { dailyRequests: 3, monthlyTokens: 1000 };
  it('counts down the daily requests and stops at the limits', () => {
    expect(decideQuota({ requestsToday: 0, tokensThisMonth: 0 }, limits)).toEqual({
      allowed: true,
      remaining: 2,
    });
    expect(decideQuota({ requestsToday: 3, tokensThisMonth: 0 }, limits)).toEqual({
      allowed: false,
      reason: 'daily',
      remaining: 0,
    });
    expect(decideQuota({ requestsToday: 1, tokensThisMonth: 1000 }, limits)).toMatchObject({
      allowed: false,
      reason: 'monthly',
    });
  });
});

describe('deepseekProvider', () => {
  const ok = (body: unknown, status = 200) =>
    Promise.resolve(new Response(JSON.stringify(body), { status }));

  it('sends the system prompt first and reads the answer and token usage', async () => {
    const fetchMock = vi.fn((..._args: unknown[]) =>
      ok({
        choices: [{ message: { content: ' Ответ ' } }],
        usage: { prompt_tokens: 120, completion_tokens: 30 },
      }),
    );
    const provider = deepseekProvider({ apiKey: 'k', fetch: fetchMock as unknown as typeof fetch });
    const result = await provider.complete({
      model: 'deepseek-flash',
      system: 'S',
      messages: [{ role: 'user', content: 'Q' }],
      maxTokens: 100,
    });
    expect(result).toEqual({ text: 'Ответ', usage: { inputTokens: 120, outputTokens: 30 } });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.deepseek.com/chat/completions');
    expect(JSON.parse(String(init.body))).toMatchObject({
      model: 'deepseek-flash',
      max_tokens: 100,
      messages: [
        { role: 'system', content: 'S' },
        { role: 'user', content: 'Q' },
      ],
    });
  });

  it('turns HTTP errors, empty answers and network failures into ProviderError', async () => {
    const run = (f: () => Promise<Response>) =>
      deepseekProvider({ apiKey: 'k', fetch: f as unknown as typeof fetch }).complete({
        model: 'm',
        system: 's',
        messages: [{ role: 'user', content: 'q' }],
        maxTokens: 1,
      });
    await expect(run(() => ok({}, 402))).rejects.toBeInstanceOf(ProviderError);
    await expect(run(() => ok({ choices: [] }))).rejects.toBeInstanceOf(ProviderError);
    await expect(run(() => Promise.reject(new Error('down')))).rejects.toBeInstanceOf(
      ProviderError,
    );
  });
});

describe('systemPrompt', () => {
  it('forbids investment advice in every purpose', () => {
    for (const p of ['chat', 'review'] as const) {
      expect(systemPrompt(p)).toContain('Не давай персональных инвестиционных рекомендаций');
    }
  });
});

describe('/ai routes', () => {
  let database: Database;
  beforeAll(async () => {
    database = await openTestDatabase();
  });
  afterAll(() => database.close());
  beforeEach(async () => {
    await database.db.delete(aiUsage);
    await database.db.delete(users);
  });

  function setup(
    provider: ChatProvider | null,
    env: Record<string, string> = {},
    course?: CourseSearch,
  ) {
    const config = loadConfig({
      NODE_ENV: 'test',
      APP_ORIGIN: 'https://bulleak.test',
      JWT_SECRET: 'test-secret-test-secret-test-secret-00',
      AI_DAILY_REQUESTS: '2',
      ...env,
    });
    return createApp({
      config,
      logger: memoryLogger(),
      db: database.db,
      mailer: memoryMailer(),
      ai: provider,
      ...(course ? { course } : {}),
    });
  }

  async function token(app: ReturnType<typeof setup>) {
    const res = await app.request(`${API_PREFIX}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ai@mail.test', password: 'T7#mVq2!xLong', name: 'Ника' }),
    });
    return authResponseSchema.parse(await res.json()).accessToken;
  }

  const chat = (app: ReturnType<typeof setup>, t: string, body: unknown) =>
    app.request(`${API_PREFIX}/ai/chat`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  const ask = { messages: [{ role: 'user', content: 'Что такое funding?' }] };

  it('answers with the light model, without the learner name, and counts the quota', async () => {
    const provider = mockProvider();
    const app = setup(provider);
    const t = await token(app);
    const res = await chat(app, t, ask);
    expect(res.status).toBe(200);
    expect(aiChatResponseSchema.parse(await res.json())).toEqual({
      text: 'Это тестовый ответ.',
      remaining: 1,
      sources: [],
    });
    const sent = provider.requests[0];
    expect(sent?.model).toBe('deepseek-flash');
    expect(JSON.stringify(sent)).not.toContain('Ника');
    expect(JSON.stringify(sent)).not.toContain('ai@mail.test');

    await chat(app, t, ask);
    const third = await chat(app, t, ask);
    expect(third.status).toBe(429);
    expect(apiErrorSchema.parse(await third.json()).error.code).toBe('ai_quota');
    expect(provider.requests).toHaveLength(2);

    const status = await app.request(`${API_PREFIX}/ai/status`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    expect(aiStatusSchema.parse(await status.json())).toEqual({ enabled: true, remaining: 0 });
  });

  it('uses the strong model for reviews and stops at the monthly token ceiling', async () => {
    const provider = mockProvider();
    const app = setup(provider, { AI_MONTHLY_TOKENS: '1', AI_DAILY_REQUESTS: '10' });
    const t = await token(app);
    expect((await chat(app, t, { ...ask, purpose: 'review' })).status).toBe(200);
    expect(provider.requests[0]?.model).toBe('deepseek-v4-pro');
    const res = await chat(app, t, ask);
    expect(res.status).toBe(429);
    expect(apiErrorSchema.parse(await res.json()).error.message).toContain('в этом месяце');
  });

  it('is off without a provider and hides provider failures from the learner', async () => {
    const off = setup(null);
    expect((await chat(off, await token(off), ask)).status).toBe(503);

    await database.db.delete(users);
    const failing = setup({
      name: 'broken',
      complete: () => Promise.reject(new ProviderError('deepseek answered 402')),
    });
    const res = await chat(failing, await token(failing), ask);
    expect(res.status).toBe(503);
    const error = apiErrorSchema.parse(await res.json()).error;
    expect(error.code).toBe('ai_unavailable');
    expect(error.message).not.toContain('402');
  });

  it('puts the course excerpts into the instructions and links them', async () => {
    const provider = mockProvider();
    const course = createCourseSearch([
      {
        id: 'm06-l01#2',
        kind: 'lesson',
        ref: 'm06-l01',
        title: 'Фандинг — как считается',
        text: 'Фандинг платят каждые 8 часов.',
      },
    ]);
    const app = setup(provider, {}, course);
    const res = await chat(app, await token(app), {
      messages: [{ role: 'user', content: 'Как часто платят фандинг?' }],
    });
    expect(aiChatResponseSchema.parse(await res.json()).sources).toEqual([
      { kind: 'lesson', ref: 'm06-l01', title: 'Фандинг' },
    ]);
    expect(provider.requests[0]?.system).toContain('Фандинг платят каждые 8 часов.');
  });

  it('rejects a conversation that does not end with a question, and guests', async () => {
    const app = setup(mockProvider());
    const t = await token(app);
    const res = await chat(app, t, { messages: [{ role: 'assistant', content: 'x' }] });
    expect(res.status).toBe(400);
    expect((await chat(app, 'nope', ask)).status).toBe(401);
  });
});

describe('course search', () => {
  const chunk = (id: string, title: string, text: string): CourseChunk => ({
    id,
    kind: 'lesson',
    ref: id.split('#')[0] ?? id,
    title,
    text,
  });
  const course = createCourseSearch([
    chunk('m06-l01#1', 'Стоп-лосс — где ставить стоп', 'Стоп ставят за уровень, а не по проценту.'),
    chunk(
      'm03-l02#1',
      'Таймфреймы',
      'Таймфрейм — период одной свечи. Дневная свеча — 6 свечей 4H.',
    ),
    chunk('m07-l03#1', 'Фандинг', 'Funding — выплата между лонгами и шортами каждые 8 часов.'),
  ]);

  it('stems Russian word forms and ignores stop words', () => {
    expect(stem('стопа')).toBe(stem('стопы'));
    expect(stem('таймфреймах')).toBe(stem('таймфрейм'));
    expect(tokenize('Что такое ФАНДИНГ?')).toEqual([stem('фандинг')]);
    expect(tokenize('Какой R:R нужен, и r / r?')).toEqual(['rr', stem('нужен'), 'rr']);
  });

  it('finds the excerpt for a question, title first', () => {
    expect(course.search('куда ставить стопы?')[0]?.chunk.id).toBe('m06-l01#1');
    expect(course.search('что такое funding')[0]?.chunk.id).toBe('m07-l03#1');
    expect(course.search('сколько свечей 4H в дневной')[0]?.chunk.id).toBe('m03-l02#1');
    expect(course.search('погода в москве')).toEqual([]);
  });

  it('fits excerpts into the budget and links each lesson once', () => {
    const all = course.search('стоп таймфрейм funding', 6).map((h) => h.chunk);
    expect(pickExcerpts(all, 70)).toHaveLength(1);
    expect(sourcesOf([...all, ...all]).map((s) => s.ref)).toHaveLength(3);
    expect(sourcesOf(all.slice(0, 1))[0]?.title).not.toContain('—');
    expect(
      searchQuery([
        { role: 'user', content: 'старый' },
        { role: 'user', content: 'про стоп' },
        { role: 'assistant', content: 'ответ' },
        { role: 'user', content: 'а почему?' },
      ]),
    ).toBe('про стоп\nа почему?');
  });

  it('loads the committed index of the whole course', () => {
    const loaded = loadCourseSearch();
    expect(loaded.error).toBeUndefined();
    expect(loaded.search.size).toBeGreaterThan(300);
    const hit = loaded.search.search('что такое ликвидация позиции')[0];
    expect(hit?.chunk.text.toLowerCase()).toContain('ликвид');
    expect(loadCourseSearch(new URL('file:///nope.json')).search.size).toBe(0);
  });
});
