import { z } from 'zod';

/** Limits from docs/04-features/ai-platform.md. */
export const AI_MESSAGE_MAX_CHARS = 2_000;
export const AI_HISTORY_MAX = 10;

export const aiMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z
    .string()
    .trim()
    .min(1, 'Напиши вопрос')
    .max(AI_MESSAGE_MAX_CHARS, `Не длиннее ${AI_MESSAGE_MAX_CHARS} символов`),
});
export type AiMessage = z.infer<typeof aiMessageSchema>;

/** chat — questions about the course (light model); review — trade and journal reviews. */
export const AI_PURPOSES = ['chat', 'review'] as const;
export type AiPurpose = (typeof AI_PURPOSES)[number];

export const aiChatBodySchema = z.object({
  messages: z
    .array(aiMessageSchema)
    .min(1)
    .max(AI_HISTORY_MAX)
    .refine((m) => m.at(-1)?.role === 'user', 'Последнее сообщение — вопрос ученика'),
  purpose: z.enum(AI_PURPOSES).default('chat'),
});
export type AiChatBody = z.input<typeof aiChatBodySchema>;

export const aiStatusSchema = z.object({
  enabled: z.boolean(),
  remaining: z.number().int().min(0),
});
export type AiStatus = z.infer<typeof aiStatusSchema>;

/** A course excerpt the assistant may quote (T-2105). Built by src/lib/ai/courseChunks.ts. */
export const COURSE_CHUNK_KINDS = ['lesson', 'term', 'cheatsheet'] as const;
export const courseChunkSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(COURSE_CHUNK_KINDS),
  /** Lesson id, glossary term id or cheat sheet id — what the site links to. */
  ref: z.string().min(1),
  title: z.string().min(1),
  text: z.string().min(1),
});
export type CourseChunk = z.infer<typeof courseChunkSchema>;

export const COURSE_INDEX_VERSION = 1;
export const courseIndexFileSchema = z.object({
  version: z.literal(COURSE_INDEX_VERSION),
  chunks: z.array(courseChunkSchema),
});
export type CourseIndexFile = z.infer<typeof courseIndexFileSchema>;

/** Where an answer came from: shown under it as links. */
export const aiSourceSchema = courseChunkSchema.pick({ kind: true, ref: true, title: true });
export type AiSource = z.infer<typeof aiSourceSchema>;

export const aiChatResponseSchema = z.object({
  text: z.string(),
  /** Requests left today for this learner. */
  remaining: z.number().int().min(0),
  /** Course excerpts the answer was based on. */
  sources: z.array(aiSourceSchema).default([]),
});
export type AiChatResponse = z.infer<typeof aiChatResponseSchema>;

/**
 * POST /ai/chat/stream (T-2102) answers with server-sent events: `delta` — a piece of the text,
 * then `done` with the quota and sources, or `error` if the model failed mid-answer.
 */
export const AI_STREAM_EVENTS = { delta: 'delta', done: 'done', error: 'error' } as const;
export const aiStreamDeltaSchema = z.object({ text: z.string() });
export const aiStreamDoneSchema = aiChatResponseSchema.omit({ text: true });
export type AiStreamDone = z.infer<typeof aiStreamDoneSchema>;
export const aiStreamErrorSchema = z.object({ code: z.string(), message: z.string() });
