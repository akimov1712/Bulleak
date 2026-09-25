import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MiniQuiz } from './MiniQuiz';

const question = {
  id: 'mini',
  type: 'single' as const,
  prompt: 'Какой ордер исполняется сразу?',
  options: [
    { id: 'a', text: 'Рыночный' },
    { id: 'b', text: 'Лимитный' },
  ],
  correct: 'a',
  explanation: 'Рыночный ордер забирает лучшие цены стакана.',
  tags: [],
};

describe('MiniQuiz', () => {
  it('checks, explains and allows another try', async () => {
    const user = userEvent.setup();
    render(<MiniQuiz question={question} />);
    expect(screen.getByRole('button', { name: 'Проверить' })).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: /Лимитный/ }));
    await user.click(screen.getByRole('button', { name: 'Проверить' }));
    expect(screen.getByRole('status')).toHaveTextContent('Правильный ответ: Рыночный');
    await user.click(screen.getByRole('button', { name: 'Попробовать ещё раз' }));
    await user.click(screen.getByRole('radio', { name: /Рыночный/ }));
    await user.click(screen.getByRole('button', { name: 'Проверить' }));
    expect(screen.getByRole('status')).toHaveTextContent('Верно!');
  });
});
