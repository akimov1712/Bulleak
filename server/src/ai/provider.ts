/**
 * Model gateway (T-2101): one interface, providers plug in as adapters. DeepSeek speaks the
 * OpenAI-compatible chat API; the mock is for tests and e2e (no network, no cost).
 */
import { createSseParser } from '@bulleak/shared';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  model: string;
  system: string;
  messages: readonly ChatTurn[];
  maxTokens: number;
}

export interface ChatUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface ChatResult {
  text: string;
  usage: ChatUsage;
}

export interface StreamOptions {
  /** Called with each new piece of the answer. */
  onDelta: (text: string) => void;
  /** Aborts the model call (the learner closed the chat). */
  signal?: AbortSignal;
}

export interface ChatProvider {
  readonly name: string;
  complete(request: ChatRequest): Promise<ChatResult>;
  /** Same as complete, but hands the answer out piece by piece as the model writes it. */
  stream(request: ChatRequest, options: StreamOptions): Promise<ChatResult>;
}

/** The provider failed; the message is for the log, never shown to the learner. */
export class ProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderError';
  }
}

interface OpenAiUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
}

interface OpenAiStyleResponse {
  choices?: { message?: { content?: string } }[];
  usage?: OpenAiUsage;
}

interface OpenAiStyleChunk {
  choices?: { delta?: { content?: string | null } }[];
  usage?: OpenAiUsage | null;
}

const usageOf = (u: OpenAiUsage | null | undefined): ChatUsage => ({
  inputTokens: u?.prompt_tokens ?? 0,
  outputTokens: u?.completion_tokens ?? 0,
});

/** Reads an OpenAI-style SSE body: content deltas, then usage, then [DONE]. */
export async function readChatStream(
  body: ReadableStream<Uint8Array>,
  onDelta: (text: string) => void,
): Promise<ChatResult> {
  const parser = createSseParser();
  const decoder = new TextDecoder();
  const reader = body.getReader();
  let text = '';
  let usage: ChatUsage = { inputTokens: 0, outputTokens: 0 };
  const handle = (data: string) => {
    if (data === '[DONE]') return;
    let chunk: OpenAiStyleChunk;
    try {
      chunk = JSON.parse(data) as OpenAiStyleChunk;
    } catch {
      return;
    }
    const piece = chunk.choices?.[0]?.delta?.content;
    if (piece) {
      // Leading whitespace of the answer is dropped, like trim() in complete().
      const out = text ? piece : piece.trimStart();
      text += piece;
      if (out) onDelta(out);
    }
    if (chunk.usage) usage = usageOf(chunk.usage);
  };
  for (;;) {
    const { done, value } = await reader.read();
    const events = done ? parser.end() : parser.push(decoder.decode(value, { stream: true }));
    for (const e of events) handle(e.data);
    if (done) break;
  }
  return { text: text.trim(), usage };
}

export interface DeepSeekOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  /** Whole streamed answer, reasoning included. */
  streamTimeoutMs?: number;
  fetch?: typeof fetch;
}

export function deepseekProvider({
  apiKey,
  baseUrl = 'https://api.deepseek.com',
  timeoutMs = 30_000,
  streamTimeoutMs = 90_000,
  fetch: fetchImpl = fetch,
}: DeepSeekOptions): ChatProvider {
  const call = async (
    { model, system, messages, maxTokens }: ChatRequest,
    stream: boolean,
    signal: AbortSignal,
  ) => {
    let res: Response;
    try {
      res = await fetchImpl(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: system }, ...messages],
          max_tokens: maxTokens,
          temperature: 0.3,
          stream,
          ...(stream ? { stream_options: { include_usage: true } } : {}),
        }),
        signal,
      });
    } catch (error) {
      throw new ProviderError(`deepseek unreachable: ${(error as Error).message}`);
    }
    if (!res.ok) throw new ProviderError(`deepseek answered ${res.status}`);
    return res;
  };

  return {
    name: 'deepseek',
    async complete(request) {
      const res = await call(request, false, AbortSignal.timeout(timeoutMs));
      const body = (await res.json().catch(() => null)) as OpenAiStyleResponse | null;
      const text = body?.choices?.[0]?.message?.content?.trim();
      if (!text) throw new ProviderError('deepseek: empty answer');
      return { text, usage: usageOf(body?.usage) };
    },
    async stream(request, { onDelta, signal }) {
      const timeout = AbortSignal.timeout(streamTimeoutMs);
      const res = await call(request, true, signal ? AbortSignal.any([signal, timeout]) : timeout);
      if (!res.body) throw new ProviderError('deepseek: no stream body');
      let result: ChatResult;
      try {
        result = await readChatStream(res.body, onDelta);
      } catch (error) {
        throw new ProviderError(`deepseek stream broke: ${(error as Error).message}`);
      }
      if (!result.text) throw new ProviderError('deepseek: empty answer');
      return result;
    },
  };
}

/** Answers with a fixed text and records the requests (tests, e2e, local runs without a key). */
export function mockProvider(
  answer: (request: ChatRequest) => string = () => 'Это тестовый ответ.',
): ChatProvider & { requests: ChatRequest[] } {
  const requests: ChatRequest[] = [];
  return {
    name: 'mock',
    requests,
    complete: (request) => {
      requests.push(request);
      const text = answer(request);
      return Promise.resolve({
        text,
        usage: { inputTokens: request.system.length + 10, outputTokens: text.length },
      });
    },
    stream: (request, { onDelta }) => {
      requests.push(request);
      const text = answer(request);
      for (const piece of text.match(/\S+\s*/g) ?? []) onDelta(piece);
      return Promise.resolve({
        text,
        usage: { inputTokens: request.system.length + 10, outputTokens: text.length },
      });
    },
  };
}
