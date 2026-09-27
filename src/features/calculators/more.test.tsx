import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { DrawdownCalc } from './DrawdownCalc';
import { EquitySimulator } from './EquitySimulator';
import { ExpectancyCalc } from './ExpectancyCalc';
import { FeesCalc } from './FeesCalc';

beforeEach(() => localStorage.clear());

describe('ExpectancyCalc', () => {
  it('m09-l03: W 40%, +2R / −1R → +0.2R a trade', () => {
    render(<ExpectancyCalc />);
    expect(screen.getByText('+0,2R')).toBeInTheDocument();
    expect(screen.getByText('+4R')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Винрейт'), { target: { value: '30' } });
    expect(screen.getByText('−0,1R')).toBeInTheDocument();
    expect(screen.getByText(/Никакой риск-менеджмент/)).toBeInTheDocument();
  });

  it('shows a dash for a win rate above 100%', () => {
    render(<ExpectancyCalc />);
    fireEvent.change(screen.getByLabelText('Винрейт'), { target: { value: '120' } });
    expect(screen.getByText(/^— Винрейт 0–100%/)).toBeInTheDocument();
  });
});

describe('DrawdownCalc', () => {
  it('m09-l01: −20% needs +25%; 10 losses at 2% ≈ −18.3%', () => {
    render(<DrawdownCalc />);
    expect(screen.getByText('+25%')).toBeInTheDocument();
    expect(screen.getByText('−18,3%')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Просадка'), { target: { value: '50' } });
    expect(screen.getByText('+100%')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Просадка'), { target: { value: '100' } });
    expect(screen.getByText(/^— Просадка/)).toBeInTheDocument();
  });
});

describe('EquitySimulator', () => {
  it('draws 20 curves and reshuffles deterministically', async () => {
    const { container } = render(<EquitySimulator />);
    expect(container.querySelectorAll('polyline')).toHaveLength(20);
    const before = container.querySelector('polyline')?.getAttribute('points');
    await userEvent.click(screen.getByRole('button', { name: 'Другие случайные серии' }));
    expect(container.querySelector('polyline')?.getAttribute('points')).not.toBe(before);
    expect(screen.getByText(/Серия убытков подряд: обычно/)).toBeInTheDocument();
  });
});

describe('FeesCalc funding', () => {
  it('m08-l05: $10 000, taker both ways + 0.01% × 9 periods, risk $100 → 20% of the risk', async () => {
    render(<FeesCalc />);
    fireEvent.change(screen.getByLabelText(/Размер позиции/), { target: { value: '10000' } });
    fireEvent.change(screen.getByLabelText(/Риск сделки/), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/Периодов funding/), { target: { value: '9' } });
    expect(screen.getByText('$20,00')).toBeInTheDocument();
    expect(screen.getByText(/съедают/)).toHaveTextContent('20% от запланированного риска');
    await userEvent.click(screen.getByRole('radio', { name: 'Спот' }));
    expect(screen.queryByLabelText(/Периодов funding/)).not.toBeInTheDocument();
  });
});
