/** Words for the learner model: the UI shows levels, exact numbers only in hints (spec, section 9). */
import type { Deficit, SkillState } from './gap';
import { MASTERED_MIN_ANSWERS } from './knowledge';

export type Tone = 'neutral' | 'bull' | 'bear' | 'warn' | 'info';

export const DEFICIT_TEXT: Record<Deficit, { label: string; tone: Tone; advice: string }> = {
  new: {
    label: 'Не начат',
    tone: 'neutral',
    advice: 'Пройди урок и тест — тогда появится оценка.',
  },
  knowledge: {
    label: 'Подтянуть теорию',
    tone: 'warn',
    advice: 'Перечитай урок и повтори вопросы по навыку.',
  },
  behaviour: {
    label: 'Знаю, но нарушаю',
    tone: 'bear',
    advice: 'Правило известно, но в сделках не соблюдается. Разбери свои сделки и пройди сценарий.',
  },
  practice: {
    label: 'Нужна практика',
    tone: 'info',
    advice: 'Теория есть — проверь её на сделках в тренажёре.',
  },
  learning: {
    label: 'Изучаю',
    tone: 'info',
    advice: 'Ещё немного практики в тестах — и навык освоен.',
  },
  mastered: { label: 'Освоен', tone: 'bull', advice: 'Осталось только плановое повторение.' },
};

/** Knowledge level in words; «мало данных» until there are enough answers. */
export function knowledgeLevel(state: Pick<SkillState, 'knowledge'>): string {
  const k = state.knowledge;
  if (!k) return 'нет ответов';
  if (k.answers < MASTERED_MIN_ANSWERS) return 'мало данных';
  if (k.p >= 0.85) return 'отлично';
  if (k.p >= 0.6) return 'хорошо';
  if (k.p >= 0.4) return 'базово';
  return 'слабо';
}

/** Practice in words: how often the rule was kept. */
export function practiceLevel(
  state: Pick<SkillState, 'behaviour' | 'hasRule' | 'traded'>,
): string | null {
  if (!state.hasRule) return null;
  const b = state.behaviour;
  if (!b) return state.traded ? 'случая ещё не было' : 'нет сделок';
  if (b.kept === b.trades) return 'соблюдается';
  if (b.kept / b.trades >= 0.7) return 'чаще соблюдается';
  return 'часто нарушается';
}

export interface SkillSummary {
  total: number;
  mastered: number;
  gaps: number;
  started: number;
}

export function summarize(states: readonly SkillState[]): SkillSummary {
  return {
    total: states.length,
    mastered: states.filter((s) => s.deficit === 'mastered').length,
    gaps: states.filter((s) => s.deficit === 'behaviour').length,
    started: states.filter((s) => s.deficit !== 'new').length,
  };
}
