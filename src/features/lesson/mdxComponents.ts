import type { MDXComponents } from 'mdx/types';
import * as Prose from './blocks/Prose';
import { BybitNote, Example, Tip, Warning } from './blocks/Callouts';
import { Checklist, Compare, Figure, Goals, Reveal, Step, Steps, Summary } from './blocks/Blocks';
import { Term } from '@/features/glossary/Term';
import { MiniQuiz } from './blocks/MiniQuiz';
import { LazyCandleChart } from '@/features/charts/LazyCandleChart';
import { Diagram } from '@/components/diagrams/Diagram';
import { MascotSay } from '@/components/mascot/MascotSay';
import { CalcEmbed } from '@/features/calculators/CalcEmbed';
import { SimScenario } from './blocks/SimScenario';
import { FibExplorer } from '@/features/charts/FibExplorer';
import { StrategyEditor } from '@/features/plan/StrategyEditor';
import { BacktestProgress } from '@/features/simulator/BacktestProgress';
import { TradingPlanEditor } from '@/features/plan/TradingPlanEditor';

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
};
