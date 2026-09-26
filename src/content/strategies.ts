/**
 * Built-in strategy rules for backtests (m11-l02 «Правила TPS»). The StrategyEditor
 * (stage 06, T-611) will let the learner edit their own copy; until then the defaults are used.
 */

export interface StrategyRules {
  /** Stored in SimTrade.strategyTag. */
  tag: string;
  title: string;
  /** Short checklist items, checked before every backtest entry. */
  rules: readonly string[];
  /** Minimum sample for a meaningful manual backtest (m11-l04). */
  targetTrades: number;
}

export const TPS: StrategyRules = {
  tag: 'tps',
  title: 'Trend Pullback Swing (TPS)',
  rules: [
    'Контекст 1D: цена выше EMA 200, структура HH/HL (для шорта — зеркально)',
    'Откат в зону 4H: 2 из 3 — флип-уровень, EMA 50, Фибо 0,5–0,618',
    'Триггер 1H: поглощение, пин-бар или слом нисходящей 1H-структуры',
    'Стоп за минимумом отката + 0,5 ATR',
    'Цель — ближайшее сопротивление 4H, но не меньше 2R',
    'Нет отмены: закрытия 4H под зоной, важной новости, открытого риска > 3%',
    'Риск 1%, плечо не больше 3×',
  ],
  targetTrades: 30,
};

export const STRATEGIES: readonly StrategyRules[] = [TPS];

export const getStrategy = (tag: string): StrategyRules | undefined =>
  STRATEGIES.find((s) => s.tag === tag);
