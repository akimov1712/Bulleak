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
  // Bybit UI mock-ups (prefix bybit-ui-: interactive, role=group)
  'bybit-ui-security': () => import('./bybit/account').then((m) => ({ default: m.BybitSecurity })),
  'bybit-ui-kyc-levels': () =>
    import('./bybit/account').then((m) => ({ default: m.BybitKycLevels })),
  'bybit-ui-assets': () => import('./bybit/funds').then((m) => ({ default: m.BybitAssets })),
  'bybit-ui-deposit': () => import('./bybit/funds').then((m) => ({ default: m.BybitDeposit })),
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
