import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { FeesCalc } from './FeesCalc';

beforeEach(() => localStorage.clear());

describe('FeesCalc', () => {
  it('shows perpetual taker fees for the defaults and their share of risk', () => {
    render(<FeesCalc />);
    // 5000 × 0.055% × 2 = 5.50; risk 50 → 11%
    expect(screen.getByText('$5,50')).toBeInTheDocument();
    expect(screen.getByText(/съедают/)).toHaveTextContent('11% от запланированного риска');
  });

  it('switches market and roles', async () => {
    render(<FeesCalc />);
    await userEvent.click(screen.getByRole('radio', { name: 'Спот' }));
    // spot 0.1% both ways: 5000 × 0.1% × 2 = 10
    expect(screen.getByText('$10,00')).toBeInTheDocument();
    // 10 / 50 = 20% — at the threshold, no warning yet
    expect(screen.getByText(/съедают/)).toHaveTextContent('20%');
    expect(screen.queryByText(/Это много/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Риск сделки/), { target: { value: '40' } });
    expect(screen.getByText(/Это много/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Бессрочные' }));
    const makers = screen.getAllByRole('radio', { name: /Мейкер/ });
    for (const m of makers) await userEvent.click(m);
    // 5000 × 0.02% × 2 = 2
    expect(screen.getByText('$2,00')).toBeInTheDocument();
  });

  it('hides the risk share without risk and explains invalid size', () => {
    render(<FeesCalc />);
    fireEvent.change(screen.getByLabelText(/Риск сделки/), { target: { value: '' } });
    expect(screen.queryByText(/от запланированного/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Размер позиции/), { target: { value: '0' } });
    expect(screen.getByText(/Введи размер позиции/)).toBeInTheDocument();
  });
});
