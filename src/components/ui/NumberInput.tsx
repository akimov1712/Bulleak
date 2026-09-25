import { useState, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { clamp, parseNumber } from '@/lib/parseNumber';
import { inputClass } from './styles';

export interface NumberInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type' | 'min' | 'max'
> {
  value: number | null;
  onValueChange: (value: number | null) => void;
  /** Suffix shown inside the field: "$", "%", "BTC". */
  unit?: string;
  min?: number;
  max?: number;
}

function toText(value: number | null): string {
  return value === null ? '' : String(value).replace('.', ',');
}

/**
 * Numeric text field that accepts "," and "." and never emits NaN.
 * Emits null while the text is empty or not a number; clamps to min/max on blur.
 */
export function NumberInput({
  value,
  onValueChange,
  unit,
  min,
  max,
  className,
  onBlur,
  ...rest
}: NumberInputProps) {
  const [text, setText] = useState(() => toText(value));
  const [lastValue, setLastValue] = useState(value);

  // Sync when the value is changed from outside (e.g. reset button).
  if (value !== lastValue) {
    setLastValue(value);
    if (parseNumber(text) !== value) setText(toText(value));
  }

  return (
    <div className={cn('relative', className)}>
      <input
        {...rest}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          const parsed = parseNumber(next);
          setLastValue(parsed);
          onValueChange(parsed);
        }}
        onBlur={(e) => {
          const parsed = parseNumber(text);
          if (parsed !== null) {
            const bounded = clamp(parsed, min, max);
            setText(toText(bounded));
            if (bounded !== parsed) {
              setLastValue(bounded);
              onValueChange(bounded);
            }
          }
          onBlur?.(e);
        }}
        className={cn(inputClass, 'font-mono tabular-nums', unit && 'pr-14')}
      />
      {unit && (
        <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm font-bold text-text-muted">
          {unit}
        </span>
      )}
    </div>
  );
}
