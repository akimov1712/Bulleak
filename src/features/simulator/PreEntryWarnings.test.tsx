import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PreEntryWarnings } from './PreEntryWarnings';

describe('PreEntryWarnings', () => {
  it('lists the broken rules and lets the learner fix or open anyway', () => {
    const onFix = vi.fn();
    const onOpenAnyway = vi.fn();
    render(
      <PreEntryWarnings rules={['risk', 'revenge']} onFix={onFix} onOpenAnyway={onOpenAnyway} />,
    );
    expect(screen.getByText('Риск на сделку не больше 1 %')).toBeInTheDocument();
    expect(screen.getByText('Без сделки из мести после убытка')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Всё равно открыть' }));
    expect(onOpenAnyway).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Исправить' }));
    expect(onFix).toHaveBeenCalled();
  });

  it('is closed without rules', () => {
    render(
      <PreEntryWarnings rules={null} onFix={() => undefined} onOpenAnyway={() => undefined} />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
