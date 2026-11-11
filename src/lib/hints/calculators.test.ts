import { describe, expect, it } from 'vitest';
import {
  drawdownAdvice,
  expectancyAdvice,
  feesAdvice,
  liquidationAdvice,
  positionAdvice,
  rrAdvice,
} from './calculators';

describe('calculator advice', () => {
  it('position: the 1 % rule and missing margin', () => {
    expect(positionAdvice({ riskPct: 1, margin: 100, balance: 1000 })).toContain('в пределах');
    expect(positionAdvice({ riskPct: 2.5, margin: 100, balance: 1000 })).toContain(
      'больше правила',
    );
    expect(positionAdvice({ riskPct: 1, margin: 2000, balance: 1000 })).toContain(
      'Маржи не хватает',
    );
  });

  it('liquidation: stop beyond liquidation first, then distance', () => {
    expect(liquidationAdvice({ distancePct: 30, stopBeyondLiquidation: true })).toContain(
      'раньше, чем сработает стоп',
    );
    expect(liquidationAdvice({ distancePct: 3, stopBeyondLiquidation: false })).toContain('всего');
    expect(liquidationAdvice({ distancePct: 30, stopBeyondLiquidation: false })).toContain(
      'заметно ближе',
    );
  });

  it('R:R: below 1, below the course minimum, fine', () => {
    expect(rrAdvice({ rr: 0.8, breakevenWinrate: 0.56 })).toContain('пропускать');
    expect(rrAdvice({ rr: 1.2, breakevenWinrate: 0.45 })).toContain('ниже минимума');
    expect(rrAdvice({ rr: 2, breakevenWinrate: 0.33 })).toContain('33');
  });

  it('expectancy, drawdown and fees', () => {
    expect(expectancyAdvice({ expectancyR: -0.1 })).toContain('теряет');
    expect(expectancyAdvice({ expectancyR: 0.3 })).toContain('30+ сделках');
    expect(drawdownAdvice({ recoveryPct: 100 })).toContain('+100');
    expect(feesAdvice({ feesShareOfRisk: 0.3 })).toContain('maker');
    expect(feesAdvice({ feesShareOfRisk: 0.05 })).toContain('не критично');
  });

  it('never tells to buy or sell', () => {
    const all = [
      positionAdvice({ riskPct: 3, margin: 5, balance: 1 }),
      liquidationAdvice({ distancePct: 1, stopBeyondLiquidation: false }),
      rrAdvice({ rr: 3, breakevenWinrate: 0.25 }),
      expectancyAdvice({ expectancyR: 1 }),
    ].join(' ');
    expect(all).not.toMatch(/покупай|продавай|шорти|лонгуй/i);
  });
});
