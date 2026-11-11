import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BehaviourCard } from './BehaviourCard';

const DAY = 86_400_000;
const T0 = new Date(2026, 10, 2, 12).getTime();

describe('BehaviourCard', () => {
  it('names the disposition effect and revenge share', () => {
    const trades = [
      { at: T0, held: 10, r: 2, pnl: 20 },
      { at: T0 + DAY, held: 40, r: -1, pnl: -10 },
    ];
    render(<BehaviourCard trades={trades} revenge={{ broken: 1, checked: 4 }} />);
    const card = screen.getByLabelText('Поведение');
    expect(card).toHaveTextContent('в 4 раза дольше прибыльных');
    expect(card).toHaveTextContent('1 из 4 сделок после убытка');
    expect(card).toHaveTextContent('после пяти торговых дней');
  });
});
