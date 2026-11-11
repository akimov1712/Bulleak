import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useProgress } from '@/store/progressStore';
import { createInitialProgress } from '@/lib/progress/initial';
import { PositionCalc } from './PositionCalc';
import { RiskRewardCalc } from './RiskRewardCalc';

beforeEach(() => {
  localStorage.clear();
  useProgress.setState(createInitialProgress(Date.now()));
});

describe('calculator advice', () => {
  it('explains the result under it', () => {
    render(
      <>
        <PositionCalc />
        <RiskRewardCalc />
      </>,
    );
    const advice = document.querySelectorAll('[data-calc-advice]');
    expect(advice).toHaveLength(2);
    expect(screen.getByText(/в пределах правила курса/)).toBeInTheDocument();
  });
});
