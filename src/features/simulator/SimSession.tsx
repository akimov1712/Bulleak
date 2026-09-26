import { useEffect, useMemo, useRef, useState, type SetStateAction } from 'react';
import { atr } from '@/lib/indicators/indicators';
import { mulberry32 } from '@/lib/random';
import { datasetInterval, type DatasetName } from '@/lib/trading/candles';
import { defaultLevels, INSTRUMENT_STEPS, planTrade, roundToTick } from '@/lib/trading/simPlan';
import {
  pickStart,
  SIM_FUTURE,
  skipAhead,
  SPEED_MS,
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
import { simRepo } from '@/db/simRepo';
import { toast } from '@/store/uiStore';
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

export interface SimSessionProps {
  dataset: DatasetName;
  seed: number;
  indicators: SimIndicators;
  onToggleIndicator: (key: keyof SimIndicators) => void;
  balance: number;
  onBalance: (next: SetStateAction<number>) => void;
  /** Pick another random moment (new seed). */
  onNewPoint: () => void;
}

interface ActiveTrade {
  order: SimOrder;
  start: number;
  riskPct: number;
  balanceBefore: number;
  state: TradeState;
}

const EMPTY_DRAFT: Omit<OrderDraft, 'riskPct' | 'leverage'> = { side: null, sl: null, tp: null };

/** One blind-trading session on a dataset from a seeded random start. */
export function SimSession(props: SimSessionProps) {
  const { dataset, balance, onBalance } = props;
  const { candles, symbol } = useDataset(dataset);
  const steps = INSTRUMENT_STEPS[symbol];
  const start = useMemo(
    () => pickStart(candles.length, mulberry32(props.seed)),
    [candles, props.seed],
  );
  const atrSeries = useMemo(() => atr(candles), [candles]);
  const wide = useMediaQuery('(min-width: 1024px)');

  const [anchor, setAnchor] = useState(start ?? 0);
  const [lines, setLines] = useState<number[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [draft, setDraft] = useState<OrderDraft>({ ...EMPTY_DRAFT, riskPct: 1, leverage: 1 });
  const [trade, setTrade] = useState<ActiveTrade | null>(null);
  const [speed, setSpeed] = useState<PlaybackSpeed>('1');
  const [paused, setPaused] = useState(false);

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
    simRepo
      .add({
        at: Date.now(),
        scenarioId: null,
        dataset,
        startIndex: trade.start,
        side: trade.order.side,
        entry: trade.order.entry,
        sl: trade.order.sl,
        tp: trade.order.tp,
        riskPct: trade.riskPct,
        balanceBefore: trade.balanceBefore,
        qty: trade.order.qty,
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
  }, [trade, result, dataset, onBalance]);

  if (start === null) {
    return <p role="alert">В этом наборе данных слишком мало свечей для тренажёра.</p>;
  }

  const cursor = trade ? trade.state.index : anchor;
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
    setTrade({
      order: { side, entry: entryPrice, sl, tp, qty: plan.qty },
      start: anchor,
      riskPct: draft.riskPct,
      balanceBefore: balance,
      state: startTrade(anchor),
    });
  };

  const levels: SimLevel[] = lines.map((p, i) => ({
    id: `line-${i}` as LevelId,
    price: p,
    tone: 'muted',
    label: '',
    dashed: true,
  }));
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
      levels.push({ id: 'sl', price: shownOrder.sl, tone: 'bear', label: 'SL', draggable: !trade });
    }
    if (shownOrder.tp !== null) {
      levels.push({ id: 'tp', price: shownOrder.tp, tone: 'bull', label: 'TP', draggable: !trade });
    }
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
  const openPnl = trade
    ? (trade.order.side === 'long'
        ? lastClose - trade.order.entry
        : trade.order.entry - lastClose) * trade.order.qty
    : 0;
  const openRisk = trade ? Math.abs(trade.order.entry - trade.order.sl) * trade.order.qty : 1;
  const nextAfterTrade =
    result && result.exitIndex <= candles.length - 1 - SIM_FUTURE ? result.exitIndex : null;

  return (
    <div className="flex flex-col gap-3">
      <SimToolbar
        indicators={props.indicators}
        onToggleIndicator={props.onToggleIndicator}
        drawing={drawing}
        onDrawing={setDrawing}
        lineCount={lines.length}
        onClearLines={() => setLines([])}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <SimChart
          candles={candles}
          anchor={anchor}
          cursor={cursor}
          intraday={datasetInterval(dataset) !== 'D'}
          indicators={props.indicators}
          levels={levels}
          markers={markers}
          onLevelDrag={
            trade
              ? undefined
              : (id, price) => {
                  if (id !== 'sl' && id !== 'tp') return;
                  setDraft((d) => ({ ...d, [id]: roundToTick(price, steps.tick) }));
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
          height={wide ? 480 : 340}
        />
        {result ? (
          <TradeResult
            result={result}
            balance={balance}
            onNext={nextAfterTrade === null ? null : () => newDecision(nextAfterTrade)}
            onNewPoint={props.onNewPoint}
          />
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
              const next = skipAhead(anchor, candles.length);
              if (next === null) props.onNewPoint();
              else newDecision(next);
            }}
          />
        )}
      </div>
    </div>
  );
}
