import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

type Loader = () => Promise<{ default: ComponentType }>;

/**
 * name → lazy loader. Diagrams are split into one chunk per module, so a lesson only
 * downloads its own module's diagrams. Referenced from MDX as <Diagram name="…" />.
 */
export const DIAGRAM_LOADERS: Record<string, Loader> = {
  // m00
  'trading-styles': () => import('./m00').then((m) => ({ default: m.TradingStyles })),
  'expectation-vs-reality': () =>
    import('./m00').then((m) => ({ default: m.ExpectationVsReality })),
  'course-roadmap': () => import('./m00').then((m) => ({ default: m.CourseRoadmap })),
  // m01
  'blockchain-chain': () => import('./m01').then((m) => ({ default: m.BlockchainChain })),
  'transaction-flow': () => import('./m01').then((m) => ({ default: m.TransactionFlow })),
  'pair-anatomy': () => import('./m01').then((m) => ({ default: m.PairAnatomy })),
  'order-book': () => import('./m01').then((m) => ({ default: m.OrderBook })),
  'wallet-types': () => import('./m01').then((m) => ({ default: m.WalletTypes })),
  'phishing-anatomy': () => import('./m01').then((m) => ({ default: m.PhishingAnatomy })),
  // m02
  'bybit-accounts': () => import('./m02').then((m) => ({ default: m.BybitAccounts })),
  'network-match': () => import('./m02').then((m) => ({ default: m.NetworkMatch })),
  'order-types': () => import('./m02').then((m) => ({ default: m.OrderTypes })),
  // m03
  'candle-anatomy': () => import('./m03').then((m) => ({ default: m.CandleAnatomy })),
  'candle-shapes': () => import('./m03').then((m) => ({ default: m.CandleShapes })),
  'tf-aggregation': () => import('./m03').then((m) => ({ default: m.TfAggregation })),
  'market-structure': () => import('./m03').then((m) => ({ default: m.MarketStructure })),
  'support-resistance': () => import('./m03').then((m) => ({ default: m.SupportResistance })),
  'role-reversal': () => import('./m03').then((m) => ({ default: m.RoleReversal })),
  'volume-confirmation': () => import('./m03').then((m) => ({ default: m.VolumeConfirmation })),
  // m04
  'single-candle-patterns': () =>
    import('./m04').then((m) => ({ default: m.SingleCandlePatterns })),
  'two-three-candle-patterns': () =>
    import('./m04').then((m) => ({ default: m.TwoThreeCandlePatterns })),
  'reversal-patterns': () => import('./m04').then((m) => ({ default: m.ReversalPatterns })),
  'continuation-patterns': () => import('./m04').then((m) => ({ default: m.ContinuationPatterns })),
  'trendline-rules': () => import('./m04').then((m) => ({ default: m.TrendlineRules })),
  // m05
  'indicator-families': () => import('./m05').then((m) => ({ default: m.IndicatorFamilies })),
  'macd-anatomy': () => import('./m05').then((m) => ({ default: m.MacdAnatomy })),
  'clean-vs-cluttered': () => import('./m05').then((m) => ({ default: m.CleanVsCluttered })),
  // m06
  'top-down-funnel': () => import('./m06').then((m) => ({ default: m.TopDownFunnel })),
  'liquidity-pools': () => import('./m06').then((m) => ({ default: m.LiquidityPools })),
  'breakout-vs-fakeout': () => import('./m06').then((m) => ({ default: m.BreakoutVsFakeout })),
  'divergence-types': () => import('./m06').then((m) => ({ default: m.DivergenceTypes })),
  // m07
  'btc-dominance': () => import('./m07').then((m) => ({ default: m.BtcDominance })),
  'oi-price-matrix': () => import('./m07').then((m) => ({ default: m.OiPriceMatrix })),
  'fear-greed-scale': () => import('./m07').then((m) => ({ default: m.FearGreedScale })),
  'macro-events': () => import('./m07').then((m) => ({ default: m.MacroEvents })),
  // m08
  'price-types': () => import('./m08').then((m) => ({ default: m.PriceTypes })),
  'long-short-pnl': () => import('./m08').then((m) => ({ default: m.LongShortPnl })),
  'leverage-margin': () => import('./m08').then((m) => ({ default: m.LeverageMargin })),
  'liquidation-ladder': () => import('./m08').then((m) => ({ default: m.LiquidationLadder })),
  'funding-flow': () => import('./m08').then((m) => ({ default: m.FundingFlow })),
  // m09
  'drawdown-recovery': () => import('./m09').then((m) => ({ default: m.DrawdownRecovery })),
  'position-sizing': () => import('./m09').then((m) => ({ default: m.PositionSizing })),
  'rr-winrate-matrix': () => import('./m09').then((m) => ({ default: m.RrWinrateMatrix })),
  'correlated-risk': () => import('./m09').then((m) => ({ default: m.CorrelatedRisk })),
  // m10
  'emotion-cycle': () => import('./m10').then((m) => ({ default: m.EmotionCycle })),
  'daily-routine': () => import('./m10').then((m) => ({ default: m.DailyRoutine })),
  'process-outcome-matrix': () =>
    import('./m10').then((m) => ({ default: m.ProcessOutcomeMatrix })),
  // m11
  'strategy-anatomy': () => import('./m11').then((m) => ({ default: m.StrategyAnatomy })),
  'tps-flow': () => import('./m11').then((m) => ({ default: m.TpsFlow })),
  'trade-management': () => import('./m11').then((m) => ({ default: m.TradeManagement })),
  overfitting: () => import('./m11').then((m) => ({ default: m.Overfitting })),
  // m12
  'scaling-ladder': () => import('./m12').then((m) => ({ default: m.ScalingLadder })),
  'growth-roadmap': () => import('./m12').then((m) => ({ default: m.GrowthRoadmap })),
  // Bybit UI mock-ups (prefix bybit-ui-: interactive, role=group)
  'bybit-ui-security': () =>
    import('./bybit/accountShots').then((m) => ({ default: m.BybitSecurity })),
  'bybit-ui-security-advanced': () =>
    import('./bybit/accountShots').then((m) => ({ default: m.BybitSecurityAdvanced })),
  'bybit-ui-kyc-levels': () =>
    import('./bybit/account').then((m) => ({ default: m.BybitKycLevels })),
  'bybit-ui-assets': () => import('./bybit/accountShots').then((m) => ({ default: m.BybitAssets })),
  'bybit-ui-deposit': () =>
    import('./bybit/accountShots').then((m) => ({ default: m.BybitDeposit })),
  'bybit-ui-terminal': () => import('./bybit/terminal').then((m) => ({ default: m.BybitTerminal })),
  'bybit-ui-order-form': () =>
    import('./bybit/accountShots').then((m) => ({ default: m.BybitOrderForm })),
  'bybit-ui-leverage': () =>
    import('./bybit/accountShots').then((m) => ({ default: m.BybitLeverage })),
  'bybit-ui-margin-mode': () =>
    import('./bybit/accountShots').then((m) => ({ default: m.BybitMarginMode })),
  'bybit-ui-demo': () => import('./bybit/demo').then((m) => ({ default: m.BybitDemo })),
  'bybit-ui-demo-entry': () =>
    import('./bybit/accountShots').then((m) => ({ default: m.BybitDemoEntry })),
  'bybit-ui-order-export': () =>
    import('./bybit/accountShots').then((m) => ({ default: m.BybitOrderExport })),
  'bybit-ui-contract-data': () =>
    import('./bybit/contract').then((m) => ({ default: m.BybitContractData })),
  'bybit-ui-funding-bar': () =>
    import('./bybit/contract').then((m) => ({ default: m.BybitFundingBar })),
  'bybit-ui-contract-detail': () =>
    import('./bybit/contract').then((m) => ({ default: m.BybitContractDetail })),
};

export const isDiagramName = (name: string) => Object.hasOwn(DIAGRAM_LOADERS, name);

const cache = new Map<string, LazyExoticComponent<ComponentType>>();

/** Stable lazy component per name (lazy() must not be recreated on every render). */
export function diagramComponent(name: string): LazyExoticComponent<ComponentType> | null {
  const loader = DIAGRAM_LOADERS[name];
  if (!loader) return null;
  let component = cache.get(name);
  if (!component) {
    component = lazy(loader);
    cache.set(name, component);
  }
  return component;
}
