import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SimToolbar } from './SimToolbar';

const base = {
  indicators: { ema20: false, ema50: false, ema200: false, rsi: false, volume: false },
  onToggleIndicator: () => undefined,
  drawing: false,
  onDrawing: () => undefined,
  lineCount: 0,
  onClearLines: () => undefined,
};

describe('SimToolbar markup', () => {
  it('toggles the markup and is locked before a scenario decision', () => {
    const onMarkup = vi.fn();
    const { rerender } = render(<SimToolbar {...base} markup={false} onMarkup={onMarkup} />);
    fireEvent.click(screen.getByRole('button', { name: 'Разметка' }));
    expect(onMarkup).toHaveBeenCalledWith(true);
    rerender(<SimToolbar {...base} markup={false} onMarkup={onMarkup} markupLocked />);
    expect(screen.getByRole('button', { name: 'Разметка' })).toBeDisabled();
  });
});
