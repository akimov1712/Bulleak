import { useEffect, useMemo, useRef, useState, type SetStateAction } from 'react';
import { atr } from '@/lib/indicators/indicators';
import { mulberry32 } from '@/lib/random';
import {
  datasetInterval,
  INTERVAL_MS,
  type DatasetName,
  type DatasetSymbol,
} from '@/lib/trading/candles';
import { defaultLevels, INSTRUMENT_STEPS, planTrade, roundToTick } from '@/lib/trading/simPlan';
import {
  momentRange,
  pickMoment,
  pickStart,
  SIM_FUTURE,
  SIM_SKIP,
  skipAhead,
  SPEED_MS,
  startAtMoment,
  type PlaybackSpeed,
} from '@/lib/trading/simSession';
import {
  closeManually,
  startTrade,
  stepTrade,
  type SimOrder,
  type TradeState,
} from '@/lib/trading/simulate';
import type { Side } from '@/lib/trading/pnl';
import { closePart, moveLevel, stopMovedAway } from '@/lib/trading/manage';
import { chartHints } from '@/lib/hints/chart';
import { MarkupNote } from './MarkupNote';
import { simRepo } from '@/db/simRepo';
import { toast } from '@/store/uiStore';
import { useProgress } from '@/store/progressStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useDataset } from '../charts/useDataset';
import {
  SimChart,
  type LevelId,
  type SimIndicators,
  type SimLevel,
  type SimMarker,
} from './SimChart';
import { SimToolbar } from './SimToolbar';
import { OrderPanel, type OrderDraft } from './OrderPanel';
import { Playback } from './Playback';
import { TradeResult } from './TradeResult';
import { ScenarioBrief, ScenarioDebrief } from './ScenarioBrief';
import { BacktestPanel } from './BacktestPanel';
import type { StrategyRules } from '@/content/strategies';
import { isDecisionCorrect } from '@/content/scenarios';
import type { SimDecision, SimScenario, TradeAction } from '@/types/trading';

export interface SimSessionProps {
  dataset: DatasetName;
  seed: number;
  indicators: SimIndicators;
  onToggleIndicator: (key: keyof SimIndicators) => void;
  balance: number;
  onBalance: (next: SetStateAction<number>) => void;
  /** Pick another random moment (new seed). */
  onNewPoint: () => void;
  /**
   * Free mode: the moment (UTC ms) to show, kept by the page so that switching the timeframe or
   * the coin shows the same instant; null — derive it from the seed.
   */
  moment?: number | null;
  /** The learner moved to another moment («Пропустить»). */
  onMoment?: (moment: number) => void;
  /** Lesson scenario: fixed start, task before and debrief after the decision. */
  scenario?: SimScenario;
  /** Backtest mode: trades are tagged and kept apart from free-mode statistics. */
  strategy?: StrategyRules;
}

interface ActiveTrade {
  /** Current levels and size (they change with in-trade actions). */
  order: SimOrder;
  /** As opened: the trade is recorded with these levels and size. */
  planned: SimOrder;
  actions: TradeAction[];
  start: number;
  riskPct: number;
  balanceBefore: number;
  state: TradeState;
}

const EMPTY_DRAFT: Omit<OrderDraft, 'riskPct' | 'leverage'> = { side: null, sl: null, tp: null };

/** Appends an action; a drag on the same candle replaces its previous step (one action per gesture). */
function withAction(actions: TradeAction[], action: TradeAction): TradeAction[] {
  const last = actions[actions.length - 1];
  return last &&
    last.kind === action.kind &&
    last.index === action.index &&
    action.kind !== 'partial'
    ? [...actions.slice(0, -1), action]
    : [...actions, action];
}

/** One blind-trading session on a dataset from a seeded random start. */
export function SimSession(props: SimSessionProps) {
  const { dataset, balance, onBalance } = props;
  const { candles, symbol } = useDataset(dataset);
  // All timeframes of the coin: the seed picks a moment valid on each of them (simulator.md).
  const hourly = useDataset(`${symbol}-60` as `${DatasetSymbol}-60`);
  const fourHour = useDataset(`${symbol}-240` as `${DatasetSymbol}-240`);
  const daily = useDataset(`${symbol}-D` as `${DatasetSymbol}-D`);
  const intervalMs = INTERVAL_MS[datasetInterval(dataset)];
  const steps = INSTRUMENT_STEPS[symbol];
  const scenario = props.scenario;
  const strategy = scenario ? undefined : props.strategy;
  const start = useMemo(() => {
    if (scenario) return scenario.startIndex;
    const range = momentRange([
      { candles: hourly.candles, intervalMs: INTERVAL_MS['60'] },
      { candles: fourHour.candles, intervalMs: INTERVAL_MS['240'] },
      { candles: daily.candles, intervalMs: INTERVAL_MS.D },
    ]);
    if (!range) return pickStart(candles.length, mulberry32(props.seed));
    const moment = props.moment ?? pickMoment(range, mulberry32(props.seed));
    return startAtMoment(candles, intervalMs, moment);
    // The moment prop is read once: the session remounts on a new seed, dataset or scenario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, hourly, fourHour, daily, intervalMs, props.seed, scenario]);
  const atrSeries = useMemo(() => atr(candles), [candles]);
  const wide = useMediaQuery('(min-width: 1024px)');
  const dispatch = useProgress((s) => s.dispatch);

  const [anchor, setAnchor] = useState(start ?? 0);
  const [lines, setLines] = useState<number[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [markup, setMarkup] = useState(false);
  const [draft, setDraft] = useState<OrderDraft>({ ...EMPTY_DRAFT, riskPct: 1, leverage: 1 });
  const [trade, setTrade] = useState<ActiveTrade | null>(null);
  const [speed, setSpeed] = useState<PlaybackSpeed>('1');
  const [paused, setPaused] = useState(false);
  /** Scenario skipped: the candles revealed up to this index. */
  const [skippedTo, setSkippedTo] = useState<number | null>(null);

  const result = trade?.state.result ?? null;
  const playing = trade !== null && result === null;

  // Replay one candle per tick.
  useEffect(() => {
    if (!playing || paused) return;
    const timer = window.setInterval(() => {
      setTrade((t) =>
        t && !t.state.result ? { ...t, state: stepTrade(candles, t.start, t.order, t.state) } : t,
      );
    }, SPEED_MS[speed]);
    return () => window.clearInterval(timer);
  }, [playing, paused, speed, candles]);

  // Book a finished trade exactly once: history in IndexedDB and the virtual balance.
  const bookedRef = useRef<object | null>(null);
  useEffect(() => {
    if (!trade || !result || bookedRef.current === result) return;
    bookedRef.current = result;
    onBalance((b) => b + result.pnl);
    // XP (daily cap), counters and sim-* achievements go through the progress pipeline.
    dispatch({
      type: 'simTrade',
      outcome: result.outcome,
      r: result.r,
      ...(strategy ? { backtest: true } : {}),
    });
    simRepo
      .add({
        at: Date.now(),
        scenarioId: scenario?.id ?? null,
        ...(strategy ? { strategyTag: strategy.tag } : {}),
        dataset,
        startIndex: trade.start,
        side: trade.planned.side,
        entry: trade.planned.entry,
        sl: trade.planned.sl,
        tp: trade.planned.tp,
        riskPct: trade.riskPct,
        balanceBefore: trade.balanceBefore,
        qty: trade.planned.qty,
        actions: trade.actions,
        exitPrice: result.exitPrice,
        exitIndex: result.exitIndex,
        outcome: result.outcome,
        pnl: result.pnl,
        r: result.r,
        fees: result.fees,
      })
      .catch((error: unknown) =>
        toast({
          tone: 'error',
          title: 'Сделка не сохранилась в истории',
          description: error instanceof Error ? error.message : undefined,
        }),
      );
  }, [trade, result, dataset, onBalance, scenario, strategy, dispatch]);

  if (start === null) {
    return <p role="alert">В этом наборе данных слишком мало свечей для тренажёра.</p>;
  }

  const cursor = trade ? trade.state.index : (skippedTo ?? anchor);
  const decision: SimDecision | null = trade
    ? trade.order.side
    : skippedTo !== null
      ? 'skip'
      : null;
  const entryPrice = candles[anchor]?.c ?? 0;
  const plan = draft.side
    ? planTrade({
        side: draft.side,
        entry: entryPrice,
        sl: draft.sl,
        tp: draft.tp,
        riskPct: draft.riskPct,
        balance,
        leverage: draft.leverage,
        symbol,
      })
    : null;

  const newDecision = (at: number) => {
    setAnchor(at);
    const c = candles[at];
    if (c && !scenario) props.onMoment?.(c.t + intervalMs);
    setTrade(null);
    setPaused(false);
    setDraft((d) => ({ ...d, ...EMPTY_DRAFT }));
  };

  const chooseSide = (side: Side) =>
    setDraft((d) => ({
      ...d,
      side,
      ...defaultLevels(side, entryPrice, atrSeries[anchor] ?? null, steps.tick),
    }));

  const open = () => {
    const { side, sl, tp } = draft;
    if (!side || sl === null || tp === null || !plan || plan.error || plan.qty === null) return;
    setPaused(false);
    const order: SimOrder = { side, entry: entryPrice, sl, tp, qty: plan.qty };
    setTrade({
      order,
      planned: order,
      actions: [],
      start: anchor,
      riskPct: draft.riskPct,
      balanceBefore: balance,
      state: startTrade(anchor, Math.abs(entryPrice - sl) * plan.qty),
    });
  };

  // Markup on the candles seen so far; locked in a scenario until the decision is made.
  const markupLocked = scenario !== undefined && decision === null;
  const hints = markup && !markupLocked ? chartHints(candles, cursor) : null;
  const levels: SimLevel[] = (hints?.levels ?? []).map((l, i) => ({
    id: `hint-${i}` as LevelId,
    price: l.price,
    tone: 'muted',
    label: l.kind === 'support' ? 'S' : 'R',
    dashed: true,
  }));
  levels.push(
    ...lines.map((p, i): SimLevel => ({
      id: `line-${i}` as LevelId,
      price: p,
      tone: 'muted',
      label: '',
      dashed: true,
    })),
  );
  const shownOrder = trade
    ? trade.order
    : draft.side
      ? { entry: entryPrice, sl: draft.sl, tp: draft.tp }
      : null;
  if (shownOrder) {
    levels.push({
      id: 'entry',
      price: shownOrder.entry,
      tone: 'info',
      label: 'Вход',
      dashed: true,
    });
    if (shownOrder.sl !== null) {
      levels.push({
        id: 'sl',
        price: shownOrder.sl,
        tone: 'bear',
        label: 'SL',
        draggable: !result,
      });
    }
    if (shownOrder.tp !== null) {
      levels.push({
        id: 'tp',
        price: shownOrder.tp,
        tone: 'bull',
        label: 'TP',
        draggable: !result,
      });
    }
  }
  if (scenario?.ideal && decision) {
    levels.push(
      { id: 'ideal-sl', price: scenario.ideal.sl, tone: 'epic', label: 'SL учеб.', dashed: true },
      { id: 'ideal-tp', price: scenario.ideal.tp, tone: 'epic', label: 'TP учеб.', dashed: true },
    );
  }
  const markers: SimMarker[] = [];
  if (trade) {
    const long = trade.order.side === 'long';
    markers.push({
      index: trade.start,
      position: long ? 'below' : 'above',
      text: long ? 'Long' : 'Short',
      tone: 'info',
    });
    if (result) {
      markers.push({
        index: result.exitIndex,
        position: long ? 'above' : 'below',
        shape: 'circle',
        text: 'Выход',
        tone: result.pnl >= 0 ? 'bull' : 'bear',
      });
    }
  }

  const lastClose = candles[cursor]?.c ?? entryPrice;
  // Open part at the last close plus a half already closed; R against the risk at entry.
  const openPnl = trade
    ? (trade.order.side === 'long'
        ? lastClose - trade.order.entry
        : trade.order.entry - lastClose) *
        trade.order.qty +
      (trade.state.partial?.grossPnl ?? 0)
    : 0;
  const openRisk = trade
    ? (trade.state.plannedRisk ??
      Math.abs(trade.planned.entry - trade.planned.sl) * trade.planned.qty)
    : 1;
  const nextAfterTrade =
    !scenario && result && result.exitIndex <= candles.length - 1 - SIM_FUTURE
      ? result.exitIndex
      : null;

  return (
    <div className="flex flex-col gap-3">
      {scenario && !decision && <ScenarioBrief scenario={scenario} />}
      <SimToolbar
        indicators={props.indicators}
        onToggleIndicator={props.onToggleIndicator}
        drawing={drawing}
        onDrawing={setDrawing}
        lineCount={lines.length}
        onClearLines={() => setLines([])}
        markup={markup}
        onMarkup={setMarkup}
        markupLocked={markupLocked}
      />
      {hints && <MarkupNote hints={hints} tick={steps.tick} />}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <SimChart
          candles={candles}
          anchor={anchor}
          cursor={cursor}
          intraday={datasetInterval(dataset) !== 'D'}
          indicators={props.indicators}
          levels={levels}
          markers={markers}
          onLevelDrag={
            result
              ? undefined
              : (id, price) => {
                  if (id !== 'sl' && id !== 'tp') return;
                  const rounded = roundToTick(price, steps.tick);
                  if (!trade) {
                    setDraft((d) => ({ ...d, [id]: rounded }));
                    return;
                  }
                  // An open trade: move the level (on its side of the price) and record it.
                  setTrade((t) => {
                    if (!t || t.state.result) return t;
                    const close = candles[t.state.index]?.c ?? t.order.entry;
                    const order = moveLevel(t.order, id, rounded, close);
                    if (!order) return t;
                    const kind = id === 'sl' ? 'move-sl' : 'move-tp';
                    return {
                      ...t,
                      order,
                      actions: withAction(t.actions, {
                        index: t.state.index,
                        kind,
                        price: rounded,
                      }),
                    };
                  });
                }
          }
          onPriceClick={
            drawing
              ? (p) => {
                  setLines((prev) => [...prev, p]);
                  setDrawing(false);
                }
              : undefined
          }
          height={wide ? 540 : 420}
        />
        <div className="flex flex-col gap-4">
          {strategy && <BacktestPanel strategy={strategy} decisionKey={anchor} />}
          {scenario && skippedTo !== null ? (
            <ScenarioDebrief scenario={scenario} decision="skip" />
          ) : result ? (
            <div className="flex flex-col gap-4">
              <TradeResult
                result={result}
                balance={balance}
                onNext={nextAfterTrade === null ? null : () => newDecision(nextAfterTrade)}
                onNewPoint={scenario ? undefined : props.onNewPoint}
              />
              {scenario && decision && <ScenarioDebrief scenario={scenario} decision={decision} />}
            </div>
          ) : trade ? (
            <Playback
              side={trade.order.side}
              bars={trade.state.index - trade.start}
              openPnl={openPnl}
              openR={openPnl / openRisk}
              speed={speed}
              onSpeed={setSpeed}
              paused={paused}
              onPause={setPaused}
              onInstant={() =>
                setTrade((t) => {
                  if (!t) return t;
                  let state = t.state;
                  while (!state.result) state = stepTrade(candles, t.start, t.order, state);
                  return { ...t, state };
                })
              }
              onCloseManually={() =>
                setTrade((t) => (t ? { ...t, state: closeManually(candles, t.order, t.state) } : t))
              }
              partClosed={trade.state.partial !== undefined}
              onClosePart={() =>
                setTrade((t) => {
                  const part = t && closePart(candles, t.order, t.state);
                  if (!t || !part) return t;
                  const price = candles[t.state.index]?.c ?? t.order.entry;
                  return {
                    ...t,
                    ...part,
                    actions: withAction(t.actions, {
                      index: t.state.index,
                      kind: 'partial',
                      price,
                    }),
                  };
                })
              }
              stopMovedAway={stopMovedAway({ ...trade.planned, actions: trade.actions }) === true}
            />
          ) : (
            <OrderPanel
              draft={draft}
              onDraft={(patch) => setDraft((d) => ({ ...d, ...patch }))}
              onSide={chooseSide}
              plan={plan}
              entry={entryPrice}
              coin={symbol.replace('USDT', '')}
              tick={steps.tick}
              qtyStep={steps.qty}
              onOpen={open}
              onSkip={() => {
                if (scenario) {
                  // A skip is a decision too: correct skips count towards sim-skip.
                  dispatch({
                    type: 'simSkip',
                    scenarioId: scenario.id,
                    correct: isDecisionCorrect(scenario, 'skip'),
                  });
                  setSkippedTo(Math.min(anchor + SIM_SKIP, candles.length - 1));
                  return;
                }
                const next = skipAhead(anchor, candles.length);
                if (next === null) props.onNewPoint();
                else newDecision(next);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
