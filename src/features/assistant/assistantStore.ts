/**
 * Assistant chat state (T-2301). The conversation lives in memory for this tab; saving it is
 * T-2306. The API is taken from the auth store, so tests can swap it.
 */
import { create } from 'zustand';
import { ApiError } from '@/api/client';
import { chatRequest, type ChatContext, type ChatMessage } from '@/lib/ai/chat';
import { useAuth } from '@/store/authStore';

interface AssistantState {
  open: boolean;
  messages: ChatMessage[];
  /** Questions left today; null until the server tells. */
  remaining: number | null;
  /** False when the server says the assistant is off. */
  enabled: boolean;
  busy: boolean;
  setOpen: (open: boolean) => void;
  refreshStatus: () => Promise<void>;
  ask: (question: string, context?: ChatContext) => Promise<void>;
  stop: () => void;
  clear: () => void;
}

let nextId = 1;
const newId = () => `m${nextId++}`;
let controller: AbortController | null = null;

const FALLBACK_ERROR = 'Не получилось получить ответ. Попробуй ещё раз.';

export const useAssistant = create<AssistantState>()((set, get) => {
  const patch = (id: string, change: Partial<ChatMessage>) =>
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, ...change } : m)) }));

  return {
    open: false,
    messages: [],
    remaining: null,
    enabled: true,
    busy: false,
    setOpen: (open) => set({ open }),

    async refreshStatus() {
      const { api, user } = useAuth.getState();
      if (!api || !user) return;
      try {
        const status = await api.aiStatus();
        set({ enabled: status.enabled, remaining: status.remaining });
      } catch {
        // Offline: the next question will tell.
      }
    },

    async ask(question, context = {}) {
      const { api } = useAuth.getState();
      const text = question.trim();
      if (!api || !text || get().busy) return;
      const user: ChatMessage = { id: newId(), role: 'user', text, status: 'done' };
      const answer: ChatMessage = { id: newId(), role: 'assistant', text: '', status: 'streaming' };
      const body = chatRequest([...get().messages, user], context);
      set((s) => ({ messages: [...s.messages, user, answer], busy: true }));
      controller = new AbortController();
      const signal = controller.signal;
      try {
        const done = await api.aiChatStream(body, {
          signal,
          onDelta: (piece) =>
            set((s) => ({
              messages: s.messages.map((m) =>
                m.id === answer.id ? { ...m, text: m.text + piece } : m,
              ),
            })),
        });
        patch(answer.id, { status: 'done', sources: done.sources });
        set({ remaining: done.remaining });
      } catch (error) {
        if (signal.aborted) {
          const partial = get().messages.find((m) => m.id === answer.id)?.text ?? '';
          if (partial) patch(answer.id, { status: 'done', text: `${partial} …` });
          else set((s) => ({ messages: s.messages.filter((m) => m.id !== answer.id) }));
        } else {
          const message = error instanceof ApiError ? error.message : FALLBACK_ERROR;
          patch(answer.id, { status: 'error', text: message });
          if (error instanceof ApiError && error.code === 'ai_quota') set({ remaining: 0 });
        }
      } finally {
        controller = null;
        set({ busy: false });
      }
    },

    stop() {
      controller?.abort();
    },

    clear() {
      controller?.abort();
      set({ messages: [] });
    },
  };
});
