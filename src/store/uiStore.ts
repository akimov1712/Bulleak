import { create } from 'zustand';
import type { Rewards } from '@/types/events';
import { hasRewards } from '@/lib/progress/applyEvent';

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
  /** Rewards waiting to be celebrated (XP fly-up, achievement toasts, level-up modal). */
  rewardsQueue: Rewards[];
  /** Last XP earned in THIS tab (drives the HUD "+N" flash; rehydrates/imports do not set it). */
  lastXpGain: { amount: number; id: number } | null;
  pushRewards: (rewards: Rewards) => void;
  /** Remove and return the oldest rewards. */
  shiftRewards: () => Rewards | undefined;
}

const MAX_TOASTS = 4;
let nextId = 1;

export const useUi = create<UiState>()((set, get) => ({
  toasts: [],
  showToast: (input) => {
    const toast: Toast = { durationMs: 4000, ...input, id: nextId++ };
    set((s) => ({ toasts: [...s.toasts, toast].slice(-MAX_TOASTS) }));
    return toast.id;
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  rewardsQueue: [],
  lastXpGain: null,
  pushRewards: (rewards) => {
    if (!hasRewards(rewards)) return;
    set((s) => ({
      rewardsQueue: [...s.rewardsQueue, rewards],
      lastXpGain: rewards.xp > 0 ? { amount: rewards.xp, id: nextId++ } : s.lastXpGain,
    }));
  },
  shiftRewards: () => {
    const [first, ...rest] = get().rewardsQueue;
    if (first) set({ rewardsQueue: rest });
    return first;
  },
}));

/** Imperative shortcut usable outside React components. */
export function toast(input: ToastInput): number {
  return useUi.getState().showToast(input);
}
