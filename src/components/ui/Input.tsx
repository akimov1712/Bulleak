import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { inputClass } from './styles';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(inputClass, className)} {...rest} />;
  },
);

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export interface SelectProps<T extends string> extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'onChange' | 'value'
> {
  options: readonly SelectOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
}

/** Native select (best on mobile) styled like other inputs. */
export function Select<T extends string>({
  options,
  value,
  onValueChange,
  className,
  ...rest
}: SelectProps<T>) {
  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={(e) => onValueChange(e.target.value as T)}
        className={cn(inputClass, 'cursor-pointer appearance-none pr-10')}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-text-muted"
      />
    </div>
  );
}
