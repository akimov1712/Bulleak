import { useId, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { NumberInput } from '@/components/ui/NumberInput';

export interface CalculatorCardProps {
  icon: LucideIcon;
  title: string;
  /** Input fields. */
  children: ReactNode;
  /** Result block; null/false when the input is invalid (then the hint is shown). */
  result: ReactNode;
  /** Shown instead of the result for invalid input (after "—"). */
  emptyHint: string;
  /** "Как считается": formula and explanation. */
  howTo?: ReactNode;
  /** Small print under the result (sources, caveats). */
  note?: ReactNode;
  onReset: () => void;
}

/** Shared calculator layout: fields, a big result, "how it works", reset. */
export function CalculatorCard(props: CalculatorCardProps) {
  const id = useId();
  const Icon = props.icon;
  return (
    <Card className="flex flex-col gap-4" role="group" aria-labelledby={`${id}-title`}>
      <div className="flex items-center gap-2">
        <Icon className="size-5 text-primary-shade" aria-hidden="true" />
        <h3 id={`${id}-title`} className="text-lg font-extrabold">
          {props.title}
        </h3>
      </div>
      {props.children}
      <div aria-live="polite">
        {props.result === null || props.result === undefined || props.result === false ? (
          <p className="text-text-muted">— {props.emptyHint}</p>
        ) : (
          props.result
        )}
      </div>
      {props.howTo && (
        <details className="rounded-2xl border-2 border-border bg-surface-2 p-3 text-sm">
          <summary className="cursor-pointer font-bold">Как считается</summary>
          <div className="mt-2 flex flex-col gap-2">{props.howTo}</div>
        </details>
      )}
      {props.note && <p className="text-xs text-text-muted">{props.note}</p>}
      <button
        type="button"
        onClick={props.onReset}
        className="self-start text-sm font-bold text-info underline"
      >
        Сбросить
      </button>
    </Card>
  );
}

export interface NumberFieldProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  unit?: string;
  min?: number;
  max?: number;
}

/** Labelled numeric input used by all calculators. */
export function NumberField({ label, value, onChange, unit, min, max }: NumberFieldProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-bold text-text-muted">
        {label}
      </label>
      <NumberInput id={id} value={value} onValueChange={onChange} unit={unit} min={min} max={max} />
    </div>
  );
}

/** Big headline number of a calculator result. */
export function ResultValue({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div>
      <p className="text-sm font-bold text-text-muted">{label}</p>
      <p className="text-3xl font-extrabold break-words tabular-nums">{value}</p>
      {sub && <p className="text-sm text-text-muted">{sub}</p>}
    </div>
  );
}

/** Secondary result rows: label on the left, value on the right. */
export function ResultRows({ rows }: { rows: readonly [string, ReactNode][] }) {
  return (
    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-text-muted">{label}</dt>
          <dd className="text-right font-bold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
