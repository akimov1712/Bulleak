import type { ProgressEvent, RewardReason } from '@/types/events';
import type { ProgressState } from '@/types/progress';
import { toDateKey } from '@/lib/date';

/** XP table — docs/04-features/gamification.md. */
export const XP = {
  lessonRead: 10,
  quizFirstPass: 50,
  quizBonus90: 10,
  quizBonus100: 25,
  quizImprovement: 5,
  maxImprovements: 3,
  examPass: 150,
  examPerfectBonus: 50,
  finalPass: 500,
  simTrade: 5,
  simTargetHit: 5,
  simDailyCap: 50,
  journalEntry: 10,
  journalDailyCap: 30,
  calculatorFirstUse: 5,
  dailyGoal: 20,
} as const;

const reason = (label: string, xp: number): RewardReason => ({ label, xp });

function capped(amount: number, alreadyToday: number, cap: number): number {
  return Math.max(0, Math.min(amount, cap - alreadyToday));
}

/**
 * XP earned for `event`, judged against the state BEFORE the event is applied
 * (so "first time" rules can look at what was already done).
 */
export function xpForEvent(
  state: ProgressState,
  event: ProgressEvent,
  now: number,
): RewardReason[] {
  const today = state.activity[toDateKey(now)];
  switch (event.type) {
    case 'lessonRead':
      return state.lessons[event.lessonId]?.readAt === undefined
        ? [reason('Урок прочитан', XP.lessonRead)]
        : [];

    case 'quizCompleted': {
      const lesson = state.lessons[event.lessonId];
      const { ratio, passed } = event.result;
      if (!passed) return [];
      if (lesson?.completedAt === undefined) {
        const out = [reason('Тест сдан', XP.quizFirstPass)];
        if (ratio >= 1) out.push(reason('Без ошибок', XP.quizBonus100));
        else if (ratio >= 0.9) out.push(reason('Почти идеально', XP.quizBonus90));
        return out;
      }
      const improved = ratio > lesson.quizBest && lesson.improvements < XP.maxImprovements;
      return improved ? [reason('Новый рекорд теста', XP.quizImprovement)] : [];
    }

    case 'examCompleted': {
      if (!event.result.passed || state.exams[event.key]?.passedAt !== undefined) return [];
      if (event.key === 'final') return [reason('Финальный экзамен сдан', XP.finalPass)];
      const out = [reason('Экзамен модуля сдан', XP.examPass)];
      if (event.result.ratio >= 1) out.push(reason('Экзамен без ошибок', XP.examPerfectBonus));
      return out;
    }

    case 'simTrade': {
      const base = XP.simTrade + (event.outcome === 'tp' ? XP.simTargetHit : 0);
      const xp = capped(base, today?.simXp ?? 0, XP.simDailyCap);
      return xp > 0 ? [reason('Сделка в тренажёре', xp)] : [];
    }

    case 'journalEntry': {
      if (!event.closed) return [];
      const xp = capped(XP.journalEntry, today?.journalXp ?? 0, XP.journalDailyCap);
      return xp > 0 ? [reason('Запись в журнале', xp)] : [];
    }

    case 'calculatorUsed':
      return state.counters.calculatorsUsed.includes(event.calcId)
        ? []
        : [reason('Новый калькулятор', XP.calculatorFirstUse)];

    case 'lessonTime':
    case 'simSkip':
    case 'backtestEvaluated':
    case 'glossaryViewed':
    case 'backupMade':
    case 'planSaved':
      return [];
  }
}

export const sumXp = (reasons: readonly RewardReason[]) => reasons.reduce((n, r) => n + r.xp, 0);
