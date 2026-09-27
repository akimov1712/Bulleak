import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useProgress } from '@/store/progressStore';
import { createInitialProgress } from '@/lib/progress/initial';
import { LiquidationCalc } from './LiquidationCalc';
import { PositionCalc } from './PositionCalc';
import { RiskRewardCalc } from './RiskRewardCalc';

beforeEach(() => {
  localStorage.clear();
  useProgress.setState(createInitialProgress(Date.now()));
});

const field = (name: RegExp) => screen.getByLabelText(name);

describe('PositionCalc', () => {
  it('m09-l02: $1000, 1%, 60 000 → 59 000 gives 0.01 BTC', () => {
    render(<PositionCalc />);
    expect(screen.getByText('0,01 монет')).toBeInTheDocument();
    expect(screen.getByText('$10,00')).toBeInTheDocument();
  });

  it('shows a dash and a hint for a stop equal to the entry', () => {
    render(<PositionCalc />);
    fireEvent.change(field(/Стоп-лосс/), { target: { value: '60000' } });
    expect(screen.getByText(/^— Заполни баланс/)).toBeInTheDocument();
    expect(screen.queryByText(/монет$/)).not.toBeInTheDocument();
  });

  it('warns when the margin is bigger than the balance and reports first use once', () => {
    render(<PositionCalc />);
    fireEvent.change(field(/Стоп-лосс/), { target: { value: '59940' } });
    expect(screen.getByText(/Маржа больше баланса/)).toBeInTheDocument();
    fireEvent.change(field(/Баланс/), { target: { value: '2000' } });
    expect(useProgress.getState().counters.calculatorsUsed).toEqual(['position']);
  });
});

describe('LiquidationCalc', () => {
  it('m08-l04: long 60 000 at 10×, MMR 0.5% → 54 300; with fee — a bit higher', async () => {
    render(<LiquidationCalc />);
    expect(screen.getByText('54 300')).toBeInTheDocument();
    expect(screen.getByText('в 9,5% от входа')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: /комиссию закрытия/ }));
    expect(screen.getByText('54 329,7')).toBeInTheDocument();
  });

  it('flags a stop behind the liquidation price', () => {
    render(<LiquidationCalc />);
    fireEvent.change(field(/Стоп-лосс/), { target: { value: '54000' } });
    expect(screen.getByText(/Стоп дальше ликвидации/)).toBeInTheDocument();
    fireEvent.change(field(/Стоп-лосс/), { target: { value: '58000' } });
    expect(screen.getByText(/Стоп сработает раньше/)).toBeInTheDocument();
  });

  it('shows a dash for leverage below 1', () => {
    render(<LiquidationCalc />);
    fireEvent.change(field(/^Плечо/), { target: { value: '0,5' } });
    expect(screen.getByText(/^— Заполни вход/)).toBeInTheDocument();
  });
});

describe('RiskRewardCalc', () => {
  it('1 : 3 needs a 25% win rate; wrong-side levels give a hint', async () => {
    render(<RiskRewardCalc />);
    expect(screen.getByText('1 : 3')).toBeInTheDocument();
    expect(screen.getByText(/нужно выигрывать 25% сделок/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Шорт' }));
    expect(screen.getByText('— Для шорта стоп выше входа, тейк ниже.')).toBeInTheDocument();
  });
});
