import { Pause, Play, SkipForward, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { cn } from '@/lib/cn';
import { formatR, formatUsd } from '@/lib/format';
import type { PlaybackSpeed } from '@/lib/trading/simSession';

export interface PlaybackProps {
  side: 'long' | 'short';
  /** Candles replayed so far. */
  bars: number;
  /** Unrealised result at the last close (before fees). */
  openPnl: number;
  openR: number;
  speed: PlaybackSpeed;
  onSpeed: (speed: PlaybackSpeed) => void;
  paused: boolean;
  onPause: (paused: boolean) => void;
  onInstant: () => void;
  onCloseManually: () => void;
  /** Half of the position is already closed. */
  partClosed?: boolean;
  onClosePart?: () => void;
  /** The stop was moved away from the price: the rule is broken (shown, not blocked). */
  stopMovedAway?: boolean;
}

/** Controls while a trade plays out candle by candle. */
export function Playback(props: PlaybackProps) {
  const positive = props.openPnl >= 0;
  return (
    <Card className="flex flex-col gap-4" aria-label="Воспроизведение сделки">
      <div className="flex items-baseline justify-between gap-2">
        <span className={cn('font-semibold', props.side === 'long' ? 'text-bull' : 'text-bear')}>
          {props.side === 'long' ? 'Long' : 'Short'} открыт
        </span>
        <span className="text-sm text-text-muted">Свечей прошло: {props.bars}</span>
      </div>
      <div aria-live="off" className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-bold text-text-muted">Сейчас</span>
        <span
          className={cn(
            'text-2xl font-semibold tabular-nums',
            positive ? 'text-bull' : 'text-bear',
          )}
        >
          {formatUsd(props.openPnl)} · {formatR(props.openR)}
        </span>
      </div>
      <Segmented
        label="Скорость"
        value={props.speed}
        options={[
          { value: '1', label: '1×' },
          { value: '4', label: '4×' },
        ]}
        onChange={props.onSpeed}
      />
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          leftIcon={
            props.paused ? (
              <Play className="size-5" aria-hidden="true" />
            ) : (
              <Pause className="size-5" aria-hidden="true" />
            )
          }
          onClick={() => props.onPause(!props.paused)}
        >
          {props.paused ? 'Дальше' : 'Пауза'}
        </Button>
        <Button
          variant="secondary"
          leftIcon={<SkipForward className="size-5" aria-hidden="true" />}
          onClick={props.onInstant}
        >
          Мгновенно
        </Button>
      </div>
      <p className="text-sm text-text-muted">
        Стоп и тейк можно перетаскивать на графике и во время сделки.
      </p>
      {props.stopMovedAway && (
        <p role="status" className="text-sm font-semibold text-warn">
          Стоп отодвинут от цены — риск вырос. Это нарушение правила курса, оно попадёт в статистику
          дисциплины.
        </p>
      )}
      {props.onClosePart && (
        <Button
          variant="secondary"
          fullWidth
          disabled={props.partClosed}
          onClick={props.onClosePart}
        >
          {props.partClosed ? 'Половина закрыта' : 'Закрыть 50 %'}
        </Button>
      )}
      <Button
        variant="danger"
        fullWidth
        leftIcon={<X className="size-5" aria-hidden="true" />}
        onClick={props.onCloseManually}
      >
        Закрыть вручную
      </Button>
    </Card>
  );
}
