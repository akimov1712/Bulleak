import { useRef } from 'react';
import { useStoredState } from '@/hooks/useStoredState';
import { useProgress } from '@/store/progressStore';

/**
 * Calculator inputs remembered in localStorage (per calculator) plus the `calculatorUsed`
 * progress event, sent once per visit on the first real change (XP only the first time ever).
 */
export function useCalculator<T extends object>(
  calcId: string,
  defaults: T,
  isValid: (value: unknown) => value is T,
  storageKey = `tc-calc:${calcId}`,
): { inputs: T; set: (patch: Partial<T>) => void; reset: () => void } {
  const [inputs, setInputs] = useStoredState<T>(storageKey, defaults, isValid);
  const dispatch = useProgress((s) => s.dispatch);
  const reported = useRef(false);
  const report = () => {
    if (reported.current) return;
    reported.current = true;
    dispatch({ type: 'calculatorUsed', calcId });
  };
  return {
    inputs,
    set: (patch) => {
      report();
      setInputs((prev) => ({ ...prev, ...patch }));
    },
    reset: () => setInputs(defaults),
  };
}
