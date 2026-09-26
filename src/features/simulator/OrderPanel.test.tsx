import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { planTrade } from '@/lib/trading/simPlan';
import { OrderPanel, type OrderDraft, type OrderPanelProps } from './OrderPanel';

const setup = (draft: OrderDraft) => {
  const plan = draft.side
    ? planTrade({
        side: draft.side,
        entry: 60_000,
        sl: draft.sl,
        tp: draft.tp,
        riskPct: draft.riskPct,
        balance: 10_000,
        leverage: draft.leverage,
        symbol: 'BTCUSDT',
      })
    : null;
  const props: OrderPanelProps = {
    draft,
    plan,
    onDraft: vi.fn(),
    onSide: vi.fn(),
    entry: 60_000,
    coin: 'BTC',
    tick: 0.1,
    qtyStep: 0.001,
    onOpen: vi.fn(),
    onSkip: vi.fn(),
  };
  render(<OrderPanel {...props} />);
  return props;
};

const openButton = () => screen.getByRole('button', { name: 'Открыть сделку' });

describe('OrderPanel', () => {
  it('cannot open before a side is chosen', () => {
    const props = setup({ side: null, sl: null, tp: null, riskPct: 1, leverage: 1 });
    expect(openButton()).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: /Long/ }));
    expect(props.onSide).toHaveBeenCalledWith('long');
  });

  it('blocks a stop on the wrong side and explains why', () => {
    setup({ side: 'long', sl: 61_000, tp: 62_000, riskPct: 1, leverage: 1 });
    expect(openButton()).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Стоп должен быть ниже цены входа');
  });

  it('shows the live calculation and warnings for a valid plan', () => {
    const props = setup({ side: 'long', sl: 54_000, tp: 64_000, riskPct: 1, leverage: 20 });
    expect(openButton()).toBeEnabled();
    expect(screen.getByText(/Ликвидация наступит раньше стопа/)).toBeInTheDocument();
    expect(screen.getByText(/R:R < 1/)).toBeInTheDocument();
    expect(screen.getByText('Ликвидация ≈')).toBeInTheDocument();
    fireEvent.click(openButton());
    expect(props.onOpen).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Пропустить/ }));
    expect(props.onSkip).toHaveBeenCalled();
  });
});
