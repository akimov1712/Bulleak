import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { CalcEmbed } from './CalcEmbed';
import { CompoundingCalc } from './CompoundingCalc';

beforeEach(() => localStorage.clear());

describe('CompoundingCalc', () => {
  it('shows the result for the defaults and flags 10% a month as unrealistic', () => {
    render(<CompoundingCalc />);
    expect(screen.getByText('$30 912,68')).toBeInTheDocument();
    expect(screen.getByText('Нереалистично')).toBeInTheDocument();
  });

  it('presets change the rate and the verdict', async () => {
    render(<CompoundingCalc />);
    await userEvent.click(screen.getByRole('button', { name: '2% в месяц' }));
    expect(screen.getByLabelText('Доход в месяц')).toHaveValue('2');
    expect(screen.getByText('Реалистично для опытного трейдера')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2% в месяц' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('explains invalid input instead of showing NaN', () => {
    render(<CompoundingCalc />);
    fireEvent.change(screen.getByLabelText('Месяцев'), { target: { value: '0' } });
    expect(screen.getByText(/целое число месяцев/)).toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });

  it('remembers inputs and resets to defaults', async () => {
    const { unmount } = render(<CompoundingCalc />);
    fireEvent.change(screen.getByLabelText('Депозит'), { target: { value: '500' } });
    unmount();
    render(<CompoundingCalc />);
    expect(screen.getByLabelText('Депозит')).toHaveValue('500');
    await userEvent.click(screen.getByRole('button', { name: 'Сбросить' }));
    expect(screen.getByLabelText('Депозит')).toHaveValue('1000');
  });
});

describe('CalcEmbed', () => {
  it('renders a known calculator and warns about an unknown id', () => {
    const { rerender } = render(<CalcEmbed id="compounding" />);
    expect(screen.getByRole('group', { name: 'Сложный процент' })).toBeInTheDocument();
    rerender(<CalcEmbed id="nope" />);
    expect(screen.getByRole('alert')).toHaveTextContent('«nope»');
  });
});
