/** Shared helpers for page tests that run quizzes and exams through the real UI. */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Question } from '@/types/quiz';

/** Option text as a literal regex prefix (texts may contain brackets, dots, etc.). */
const textStart = (text = '') =>
  new RegExp(text.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, (ch) => `\\${ch}`));

export function currentQuestion(questions: readonly Question[]): Question {
  const prompt = screen.getByRole('heading', { level: 1 }).textContent;
  const q = questions.find((x) => x.prompt === prompt);
  if (!q) throw new Error(`Unknown question on screen: ${prompt}`);
  return q;
}

/** Answer the question on screen correctly (or deliberately wrong). */
export async function answer(q: Question, correct: boolean) {
  const user = userEvent.setup();
  switch (q.type) {
    case 'single': {
      const option = correct
        ? q.options.find((o) => o.id === q.correct)
        : q.options.find((o) => o.id !== q.correct);
      await user.click(screen.getByRole('radio', { name: textStart(option?.text) }));
      break;
    }
    case 'truefalse':
      await user.click(
        screen.getByRole('radio', {
          name: new RegExp(`^\\d?${q.correct === correct ? 'Верно' : 'Неверно'}`),
        }),
      );
      break;
    case 'multi':
      for (const o of q.options.filter((x) =>
        correct ? q.correct.includes(x.id) : !q.correct.includes(x.id),
      )) {
        await user.click(screen.getByRole('checkbox', { name: textStart(o.text) }));
      }
      break;
    case 'numeric':
      await user.type(screen.getByRole('textbox'), String(correct ? q.correct : q.correct + 100));
      break;
    case 'match':
      for (const [i, p] of q.pairs.entries()) {
        const right = correct ? p.right : (q.pairs[(i + 1) % q.pairs.length]?.right ?? p.right);
        await user.selectOptions(screen.getByLabelText(p.left), right);
      }
      break;
    case 'order': {
      if (!correct) break; // the shuffled start order is guaranteed wrong
      for (const [target, item] of q.items.entries()) {
        const list = screen.getByRole('list', { name: 'Порядок элементов' });
        const pos = within(list)
          .getAllByRole('listitem')
          .findIndex((li) => li.textContent?.includes(item));
        for (let k = pos; k > target; k--)
          await user.click(screen.getByRole('button', { name: `Поднять «${item}»` }));
      }
      break;
    }
    case 'chart-click':
      throw new Error('chart-click is not supported by this helper');
  }
}
