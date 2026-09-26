import type { ComponentType } from 'react';
import { CompoundingCalc } from './CompoundingCalc';

/** Calculators embeddable in lessons as <CalcEmbed id="…" />. The rest arrive in stage 06. */
export const CALCULATORS: Record<string, ComponentType> = {
  compounding: CompoundingCalc,
};

export const isCalculatorId = (id: string) => Object.hasOwn(CALCULATORS, id);
