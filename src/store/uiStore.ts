import { create } from 'zustand';

export type ToastTone = 'success' | 'error' | 'info' | 'xp' | 'achievement';

export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
  /** Emoji or short icon text shown on the left. */
  icon?: string;
  durationMs: number;
}

export type ToastInput = Omit<Toast, 'id' | 'durationMs'> & { durationMs?: number };

interface UiState {
  toasts: Toast[];
  showToast: (toast: ToastInput) => number;
  dismissToast: (id: number) => void;
}

const MAX_TOASTS = 4;
let nextId = 1;

export const useUi = create<UiState>()((set) => ({
  toasts: [],
  showToast: (input) => {
    const toast: Toast = { durationMs: 4000, ...input, id: nextId++ };
    set((s) => ({ toasts: [...s.toasts, toast].slice(-MAX_TOASTS) }));
    return toast.id;
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Imperative shortcut usable outside React components. */
export function toast(input: ToastInput): number {
  return useUi.getState().showToast(input);
}
