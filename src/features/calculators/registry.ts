import type { ComponentType } from 'react';
import { CompoundingCalc } from './CompoundingCalc';
import { FeesCalc } from './FeesCalc';

/** Calculators embeddable in lessons as <CalcEmbed id="…" />. The rest arrive in stage 06. */
export const CALCULATORS: Record<string, ComponentType> = {
  compounding: CompoundingCalc,
  fees: FeesCalc,
};

export const isCalculatorId = (id: string) => Object.hasOwn(CALCULATORS, id);
