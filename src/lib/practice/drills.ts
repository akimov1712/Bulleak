/**
 * Skill drills (T-2502): endless generated tasks on one skill — position size, R:R,
 * liquidation price, result in R. Answers come from the same functions the calculators use.
 */
import type { Rng } from '@/lib/random';
import { pick } from '@/lib/random';
import { BTCUSDT_MMR_PCT, liquidationPrice } from '@/lib/trading/liquidation';
import { positionSize } from '@/lib/trading/position';
import { riskReward, rMultiple } from '@/lib/trading/rr';

export const DRILL_KINDS = ['size', 'rr', 'liquidation', 'r-result'] as const;
export type DrillKind = (typeof DRILL_KINDS)[number];

export const DRILL_LABEL: Record<DrillKind, string> = {
  size: 'Размер позиции',
  rr: 'Риск и прибыль',
  liquidation: 'Ликвидация',
  'r-result': 'Результат в R',
};

/** Skill-graph node each drill trains (src/content/skills.ts). */
export const DRILL_SKILL: Record<DrillKind, string> = {
  size: 'position-size',
  rr: 'expectancy',
  liquidation: 'leverage-liquidation',
  'r-result': 'risk-per-trade',
};

export interface Drill {
  kind: DrillKind;
  prompt: string;
  answer: number;
  /** Accepted absolute deviation from `answer`. */
  tolerance: number;
  unit: string;
  explanation: string;
}

const COINS = [
  { symbol: 'BTC', price: [52_000, 98_000], step: 100 },
  { symbol: 'ETH', price: [1_800, 4_200], step: 10 },
  { symbol: 'SOL', price: [90, 260], step: 1 },
] as const;

const fmt = (n: number, digits = 2) =>
  n.toLocaleString('ru-RU', { maximumFractionDigits: digits, minimumFractionDigits: 0 });

const between = (rng: Rng, min: number, max: number, step: number) =>
  Math.round((min + rng() * (max - min)) / step) * step;

function coin(rng: Rng) {
  const c = pick(COINS, rng) ?? COINS[0];
  return { symbol: c.symbol, price: between(rng, c.price[0], c.price[1], c.step) };
}

function sizeDrill(rng: Rng): Drill {
  const balance = pick([500, 1_000, 2_000, 2_500, 4_000, 5_000, 10_000], rng) ?? 1_000;
  const riskPct = pick([0.5, 1, 1, 2], rng) ?? 1;
  const stopPct = pick([1, 1.5, 2, 2.5, 3, 4, 5], rng) ?? 2;
  const { symbol, price } = coin(rng);
  const long = rng() < 0.5;
  const stop = price * (1 + ((long ? -1 : 1) * stopPct) / 100);
  const size = positionSize({ balance, riskPct, entry: price, stop });
  const notional = size?.notional ?? 0;
  return {
    kind: 'size',
    prompt: `Депозит ${fmt(balance)} $, риск ${fmt(riskPct)} %. ${long ? 'Лонг' : 'Шорт'} ${symbol} от ${fmt(price)}, стоп на ${fmt(stop)} (${fmt(stopPct)} % от входа). Какой размер позиции в долларах?`,
    answer: notional,
    tolerance: Math.max(1, notional * 0.01),
    unit: '$',
    explanation: `Риск в деньгах: ${fmt(balance)} × ${fmt(riskPct)} % = ${fmt((balance * riskPct) / 100)} $. Позиция = риск / расстояние до стопа: ${fmt((balance * riskPct) / 100)} / ${fmt(stopPct)} % = ${fmt(notional, 0)} $. Плечо на размер позиции не влияет.`,
  };
}

function rrDrill(rng: Rng): Drill {
  const { symbol, price } = coin(rng);
  const long = rng() < 0.5;
  const riskPct = pick([1, 1.5, 2, 2.5, 3], rng) ?? 2;
  const rewardPct = riskPct * (pick([1, 1.5, 2, 2.5, 3, 4], rng) ?? 2);
  const dir = long ? 1 : -1;
  const stop = price * (1 - (dir * riskPct) / 100);
  const target = price * (1 + (dir * rewardPct) / 100);
  const rr = riskReward(long ? 'long' : 'short', price, stop, target);
  const ratio = rr?.rr ?? rewardPct / riskPct;
  return {
    kind: 'rr',
    prompt: `${long ? 'Лонг' : 'Шорт'} ${symbol}: вход ${fmt(price)}, стоп ${fmt(stop)}, тейк ${fmt(target)}. Сколько прибыли на 1 риск (R:R = 1 : ?)`,
    answer: ratio,
    tolerance: 0.06,
    unit: 'R',
    explanation: `Риск — ${fmt(Math.abs(price - stop))} (${fmt(riskPct)} %), прибыль до тейка — ${fmt(Math.abs(target - price))} (${fmt(rewardPct)} %). ${fmt(rewardPct)} / ${fmt(riskPct)} = ${fmt(ratio)}. Правило курса — не меньше 1:2.`,
  };
}

function liquidationDrill(rng: Rng): Drill {
  const { symbol, price } = coin(rng);
  const long = rng() < 0.5;
  const leverage = pick([3, 5, 10, 20], rng) ?? 5;
  const side = long ? 'long' : 'short';
  const liq = liquidationPrice({ side, entry: price, leverage, mmrPct: BTCUSDT_MMR_PCT }) ?? 0;
  const formula = long ? '× (1 − 1/плечо + MMR)' : '× (1 + 1/плечо − MMR)';
  return {
    kind: 'liquidation',
    prompt: `${long ? 'Лонг' : 'Шорт'} ${symbol} от ${fmt(price)}, изолированная маржа, плечо ${leverage}×, MMR 0,5 %. Примерная цена ликвидации (без комиссий)?`,
    answer: liq,
    tolerance: price * 0.002,
    unit: '$',
    explanation: `Ликвидация ≈ вход ${formula} = ${fmt(price)} ${formula.replace('плечо', String(leverage)).replace('MMR', '0,005')} ≈ ${fmt(liq)}. Это ${fmt((Math.abs(price - liq) / price) * 100, 1)} % от входа: стоп должен стоять заметно ближе.`,
  };
}

function rResultDrill(rng: Rng): Drill {
  const risk = pick([20, 25, 40, 50, 80, 100], rng) ?? 50;
  const multiple = pick([-1, -0.5, -0.25, 0.5, 1, 1.5, 2, 2.5, 3], rng) ?? 1;
  const result = risk * multiple;
  const r = rMultiple(result, risk) ?? multiple;
  return {
    kind: 'r-result',
    prompt: `Риск сделки ${fmt(risk)} $. Закрыта с результатом ${result >= 0 ? '+' : '−'}${fmt(Math.abs(result))} $. Какой результат в R?`,
    answer: r,
    tolerance: 0.01,
    unit: 'R',
    explanation: `R = результат / риск = ${fmt(result)} / ${fmt(risk)} = ${fmt(r)}. В R сделки разного размера сравниваются честно.`,
  };
}

const GENERATORS: Record<DrillKind, (rng: Rng) => Drill> = {
  size: sizeDrill,
  rr: rrDrill,
  liquidation: liquidationDrill,
  'r-result': rResultDrill,
};

export function generateDrill(kind: DrillKind, rng: Rng): Drill {
  return GENERATORS[kind](rng);
}

/** True when the answer is within the drill's tolerance. */
export function checkDrill(drill: Drill, value: number | null): boolean {
  if (value === null || !Number.isFinite(value)) return false;
  return Math.abs(value - drill.answer) <= drill.tolerance + 1e-9;
}

export interface DrillStats {
  done: number;
  correct: number;
  streak: number;
  best: number;
}

export const EMPTY_DRILL_STATS: DrillStats = { done: 0, correct: 0, streak: 0, best: 0 };

/** Stats after one more answer. */
export function recordDrill(stats: DrillStats, correct: boolean): DrillStats {
  const streak = correct ? stats.streak + 1 : 0;
  return {
    done: stats.done + 1,
    correct: stats.correct + (correct ? 1 : 0),
    streak,
    best: Math.max(stats.best, streak),
  };
}
