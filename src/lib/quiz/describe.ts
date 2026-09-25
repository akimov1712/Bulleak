import type { Question } from '@/types/quiz';
import { formatNumber, formatPrice } from '@/lib/format';

/** Human-readable correct answer for feedback and the mistakes review. */
export function correctAnswerText(q: Question): string {
  switch (q.type) {
    case 'single':
      return q.options.find((o) => o.id === q.correct)?.text ?? '';
    case 'multi':
      return q.options
        .filter((o) => q.correct.includes(o.id))
        .map((o) => o.text)
        .join('; ');
    case 'truefalse':
      return q.correct ? 'Верно' : 'Неверно';
    case 'numeric':
      return `${formatNumber(q.correct, 6)}${q.unit ? ` ${q.unit}` : ''}`;
    case 'chart-click':
      return q.target.kind === 'price'
        ? `зона ${formatPrice(q.target.min, 0.01)} – ${formatPrice(q.target.max, 0.01)}`
        : 'отмеченная свеча на графике';
    case 'match':
      return q.pairs.map((p) => `${p.left} → ${p.right}`).join('; ');
    case 'order':
      return q.items.map((item, i) => `${i + 1}. ${item}`).join(' → ');
  }
}

/** Short instruction shown above the answer area. */
export function questionHint(q: Question): string {
  switch (q.type) {
    case 'single':
      return 'Выбери один ответ';
    case 'multi':
      return 'Выбери все верные ответы';
    case 'truefalse':
      return 'Верно или неверно?';
    case 'numeric':
      return 'Введи число';
    case 'chart-click':
      return 'Кликни на графике';
    case 'match':
      return 'Сопоставь пары';
    case 'order':
      return 'Расставь по порядку';
  }
}

/** Whether the learner gave something checkable (enables the "Проверить" button). */
export function isAnswered(q: Question, value: unknown): boolean {
  switch (q.type) {
    case 'single':
      return typeof value === 'string';
    case 'multi':
      return Array.isArray(value) && value.length > 0;
    case 'truefalse':
      return typeof value === 'boolean';
    case 'numeric':
      return typeof value === 'number' && Number.isFinite(value);
    case 'chart-click':
      return typeof value === 'object' && value !== null;
    case 'match':
      return (
        typeof value === 'object' &&
        value !== null &&
        q.pairs.every((p) => typeof (value as Record<string, unknown>)[p.left] === 'string')
      );
    case 'order':
      return Array.isArray(value) && value.length === q.items.length;
  }
}
