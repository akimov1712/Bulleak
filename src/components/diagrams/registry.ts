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
  // Bybit UI mock-ups (prefix bybit-ui-: interactive, role=group)
  'bybit-ui-security': () => import('./bybit/account').then((m) => ({ default: m.BybitSecurity })),
  'bybit-ui-kyc-levels': () =>
    import('./bybit/account').then((m) => ({ default: m.BybitKycLevels })),
  'bybit-ui-assets': () => import('./bybit/funds').then((m) => ({ default: m.BybitAssets })),
  'bybit-ui-deposit': () => import('./bybit/funds').then((m) => ({ default: m.BybitDeposit })),
  'bybit-ui-terminal': () => import('./bybit/terminal').then((m) => ({ default: m.BybitTerminal })),
  'bybit-ui-order-form': () =>
    import('./bybit/orderForm').then((m) => ({ default: m.BybitOrderForm })),
  'bybit-ui-demo': () => import('./bybit/demo').then((m) => ({ default: m.BybitDemo })),
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
