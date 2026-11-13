/**
 * Model gateway (T-2101): one interface, providers plug in as adapters. DeepSeek speaks the
 * OpenAI-compatible chat API; the mock is for tests and e2e (no network, no cost).
 */

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

export interface ChatProvider {
  readonly name: string;
  complete(request: ChatRequest): Promise<ChatResult>;
}

/** The provider failed; the message is for the log, never shown to the learner. */
export class ProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderError';
  }
}

interface OpenAiStyleResponse {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export interface DeepSeekOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export function deepseekProvider({
  apiKey,
  baseUrl = 'https://api.deepseek.com',
  timeoutMs = 30_000,
  fetch: fetchImpl = fetch,
}: DeepSeekOptions): ChatProvider {
  return {
    name: 'deepseek',
    async complete({ model, system, messages, maxTokens }) {
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
            stream: false,
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        throw new ProviderError(`deepseek unreachable: ${(error as Error).message}`);
      }
      if (!res.ok) throw new ProviderError(`deepseek answered ${res.status}`);
      const body = (await res.json().catch(() => null)) as OpenAiStyleResponse | null;
      const text = body?.choices?.[0]?.message?.content?.trim();
      if (!text) throw new ProviderError('deepseek: empty answer');
      return {
        text,
        usage: {
          inputTokens: body?.usage?.prompt_tokens ?? 0,
          outputTokens: body?.usage?.completion_tokens ?? 0,
        },
      };
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
  };
}
