/**
 * Assistant chat on the site (T-2301): what goes to the API and how answers are shown. Pure.
 */
import {
  AI_HISTORY_MAX,
  AI_MESSAGE_MAX_CHARS,
  type AiChatBody,
  type AiSource,
} from '@bulleak/shared';

export type ChatStatus = 'done' | 'streaming' | 'error';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  status: ChatStatus;
  sources?: readonly AiSource[];
}

export interface ChatContext {
  /** Title of the lesson the learner is reading, if any. */
  lessonTitle?: string;
}

const clip = (text: string) => text.trim().slice(0, AI_MESSAGE_MAX_CHARS);

/**
 * The request for the conversation: finished messages only, the last AI_HISTORY_MAX of them,
 * starting with a question; the current lesson is mentioned in the last question.
 */
export function chatRequest(
  history: readonly ChatMessage[],
  context: ChatContext = {},
): AiChatBody {
  const turns = history
    .filter((m) => m.status === 'done' && m.text.trim())
    .map((m) => ({ role: m.role, content: clip(m.text) }));
  let recent = turns.slice(-AI_HISTORY_MAX);
  while (recent.length && recent[0]?.role !== 'user') recent = recent.slice(1);
  const last = recent.at(-1);
  if (last?.role === 'user' && context.lessonTitle) {
    recent = [
      ...recent.slice(0, -1),
      {
        role: 'user',
        content: clip(`(Я сейчас в уроке «${context.lessonTitle}».) ${last.content}`),
      },
    ];
  }
  return { messages: recent, purpose: 'chat' };
}

/** Lesson id from a router path: /lesson/m03-l02 and /lesson/m03-l02/quiz → m03-l02. */
export function lessonIdFromPathname(pathname: string): string | null {
  return /^\/lesson\/(m\d{2}-l\d{2})(?:\/|$)/.exec(pathname)?.[1] ?? null;
}

/** Markdown the model may use → plain text for a chat bubble (bold, headings, list marks). */
export function plainAnswer(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[ \t]*[*-][ \t]+/gm, '• ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Starter questions: about the current lesson, or general ones. */
export function suggestions(context: ChatContext = {}): string[] {
  if (context.lessonTitle) {
    return [
      'Объясни главное из этого урока простыми словами',
      'Приведи пример с числами по этому уроку',
      'Какие ошибки новички делают в этой теме?',
    ];
  }
  return [
    'Как посчитать размер позиции при риске 1 %?',
    'Что такое funding rate?',
    'Почему стоп нужен в каждой сделке?',
  ];
}

/** Messages kept on this device (T-2306): enough to scroll back, small in storage. */
export const CHAT_KEPT = 40;

const SOURCE_KINDS = new Set(['lesson', 'term', 'cheatsheet']);

function isSource(value: unknown): value is AiSource {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.kind === 'string' &&
    SOURCE_KINDS.has(s.kind) &&
    typeof s.ref === 'string' &&
    typeof s.title === 'string'
  );
}

/**
 * Saved history → messages: broken entries dropped, the last CHAT_KEPT kept. An answer that was
 * still streaming when the page closed is kept as cut off (or dropped if it was empty).
 */
export function sanitizeHistory(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatMessage[] = [];
  for (const item of raw as unknown[]) {
    if (typeof item !== 'object' || item === null) continue;
    const m = item as Record<string, unknown>;
    if (typeof m.id !== 'string' || typeof m.text !== 'string') continue;
    if (m.role !== 'user' && m.role !== 'assistant') continue;
    if (m.status !== 'done' && m.status !== 'error' && m.status !== 'streaming') continue;
    if (m.status === 'streaming' && !m.text) continue;
    const sources = Array.isArray(m.sources) ? m.sources.filter(isSource) : [];
    out.push({
      id: m.id,
      role: m.role,
      text: m.status === 'streaming' ? `${m.text} …` : m.text,
      status: m.status === 'streaming' ? 'done' : m.status,
      ...(sources.length ? { sources } : {}),
    });
  }
  return out.slice(-CHAT_KEPT);
}
