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

export const aiChatResponseSchema = z.object({
  text: z.string(),
  /** Requests left today for this learner. */
  remaining: z.number().int().min(0),
});
export type AiChatResponse = z.infer<typeof aiChatResponseSchema>;

export const aiStatusSchema = z.object({
  enabled: z.boolean(),
  remaining: z.number().int().min(0),
});
export type AiStatus = z.infer<typeof aiStatusSchema>;
