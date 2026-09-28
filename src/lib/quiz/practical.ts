/**
 * Practical part of the final exam (exams-certificate.md): the learner decides on three real
 * chart moments. The decision is graded — direction, risk ≤ 1 %, R:R ≥ 1.5 — never the outcome.
 */
import type { SimDecision } from '@/types/trading';

export const PRACTICAL_LIMITS = { maxRiskPct: 1, minRR: 1.5 } as const;

export interface PracticalAnswer {
  decision: SimDecision;
  /** Market entry: the close of the decision candle. */
  entry: number;
  sl: number | null;
  tp: number | null;
  riskPct: number | null;
}

export interface PracticalGrade {
  /** Long / short / skip matches the textbook reading. */
  decisionOk: boolean;
  /** Stop below the entry for a long, above for a short. */
  stopOk: boolean;
  /** Take profit on the profit side of the entry. */
  takeOk: boolean;
  /** 0 < risk ≤ 1 %. */
  riskOk: boolean;
  /** Reward-to-risk ≥ 1.5. */
  rrOk: boolean;
  /** Planned R:R, null when levels are missing or invalid. */
  rr: number | null;
  passed: boolean;
}

export function gradePractical(expected: SimDecision, a: PracticalAnswer): PracticalGrade {
  const decisionOk = a.decision === expected;
  if (a.decision === 'skip') {
    // Skipping needs no levels: only the decision is judged.
    return {
      decisionOk,
      stopOk: true,
      takeOk: true,
      riskOk: true,
      rrOk: true,
      rr: null,
      passed: decisionOk,
    };
  }
  const s = a.decision === 'long' ? 1 : -1;
  const stopOk = a.sl !== null && s * (a.entry - a.sl) > 0;
  const takeOk = a.tp !== null && s * (a.tp - a.entry) > 0;
  const riskOk = a.riskPct !== null && a.riskPct > 0 && a.riskPct <= PRACTICAL_LIMITS.maxRiskPct;
  const rr =
    stopOk && takeOk && a.sl !== null && a.tp !== null
      ? Math.abs(a.tp - a.entry) / Math.abs(a.entry - a.sl)
      : null;
  // Small tolerance so 1.5 typed from rounded prices still counts.
  const rrOk = rr !== null && rr >= PRACTICAL_LIMITS.minRR - 1e-9;
  return {
    decisionOk,
    stopOk,
    takeOk,
    riskOk,
    rrOk,
    rr,
    passed: decisionOk && stopOk && takeOk && riskOk && rrOk,
  };
}

/** The practical part is passed when every scenario is. */
export const practicalPassed = (grades: readonly PracticalGrade[]) =>
  grades.length > 0 && grades.every((g) => g.passed);
