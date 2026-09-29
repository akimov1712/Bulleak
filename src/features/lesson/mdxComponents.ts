import type { MDXComponents } from 'mdx/types';
import * as Prose from './blocks/Prose';
import { BybitNote, Example, Tip, Warning } from './blocks/Callouts';
import { Checklist, Compare, Figure, Goals, Reveal, Step, Steps, Summary } from './blocks/Blocks';
import { Term } from '@/features/glossary/Term';
import { MiniQuiz } from './blocks/MiniQuiz';
import { LazyCandleChart } from '@/features/charts/LazyCandleChart';
import { Diagram } from '@/components/diagrams/Diagram';
import { MascotSay } from '@/components/mascot/MascotSay';
import { SimScenario } from './blocks/SimScenario';
import { lazyBlock } from './lazyBlock';

// Heavy interactive blocks load on demand: they pull in the database, the glossary or
// calculators, which most lessons don't need on first paint.
const CalcEmbed = lazyBlock(
  () => import('@/features/calculators/CalcEmbed').then((m) => m.CalcEmbed),
  '20rem',
);
const FibExplorer = lazyBlock(
  () => import('@/features/charts/FibExplorer').then((m) => m.FibExplorer),
  '24rem',
);
const ReadinessChecklist = lazyBlock(() =>
  import('@/features/plan/ReadinessChecklist').then((m) => m.ReadinessChecklist),
);
const StrategyEditor = lazyBlock(() =>
  import('@/features/plan/StrategyEditor').then((m) => m.StrategyEditor),
);
const TradingPlanEditor = lazyBlock(() =>
  import('@/features/plan/TradingPlanEditor').then((m) => m.TradingPlanEditor),
);
const BacktestProgress = lazyBlock(() =>
  import('@/features/simulator/BacktestProgress').then((m) => m.BacktestProgress),
);
const ForwardTestProgress = lazyBlock(() =>
  import('@/features/journal/ForwardTestProgress').then((m) => m.ForwardTestProgress),
);
const WeakTopics = lazyBlock(() => import('@/features/stats/WeakTopics').then((m) => m.WeakTopics));

/** Everything a lesson MDX file can use. See docs/02-architecture/content-pipeline.md. */
export const mdxComponents: MDXComponents = {
  h2: Prose.H2,
  h3: Prose.H3,
  p: Prose.P,
  ul: Prose.Ul,
  ol: Prose.Ol,
  li: Prose.Li,
  strong: Prose.Strong,
  a: Prose.A,
  table: Prose.Table,
  th: Prose.Th,
  td: Prose.Td,
  blockquote: Prose.Blockquote,
  code: Prose.Code,
  hr: Prose.Hr,

  Goals,
  Summary,
  Tip,
  Warning,
  Example,
  BybitNote,
  Figure,
  Reveal,
  Steps,
  Step,
  Compare,
  Checklist,
  Term,
  MiniQuiz,
  CandleChart: LazyCandleChart,
  Diagram,
  MascotSay,
  CalcEmbed,
  SimScenario,
  FibExplorer,
  TradingPlanEditor,
  StrategyEditor,
  BacktestProgress,
  ForwardTestProgress,
  ReadinessChecklist,
  WeakTopics,
};
