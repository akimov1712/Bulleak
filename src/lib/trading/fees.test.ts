import { describe, expect, it } from 'vitest';
import { BYBIT_BASE_FEES, feeFor, roundTripFees } from './fees';

describe('fees', () => {
  it('fee is a percent of the notional value', () => {
    expect(feeFor(2000, 0.055)).toBeCloseTo(1.1);
    expect(feeFor(5000, BYBIT_BASE_FEES.perpetual.taker)).toBeCloseTo(2.75);
  });

  it('round trip adds entry and exit by role', () => {
    const r = roundTripFees(10_000, BYBIT_BASE_FEES.perpetual, 'taker', 'taker');
    expect(r?.total).toBeCloseTo(11);
    const mixed = roundTripFees(10_000, BYBIT_BASE_FEES.perpetual, 'maker', 'taker');
    expect(mixed?.entry).toBeCloseTo(2);
    expect(mixed?.exit).toBeCloseTo(5.5);
  });

  it('shows the share of the planned risk that fees eat', () => {
    expect(
      roundTripFees(5000, BYBIT_BASE_FEES.perpetual, 'taker', 'taker', 50)?.shareOfRiskPct,
    ).toBeCloseTo(11);
    expect(roundTripFees(5000, BYBIT_BASE_FEES.spot, 'taker', 'taker')?.shareOfRiskPct).toBeNull();
    expect(
      roundTripFees(5000, BYBIT_BASE_FEES.spot, 'taker', 'taker', 0)?.shareOfRiskPct,
    ).toBeNull();
  });

  it('rejects invalid notional', () => {
    expect(roundTripFees(0, BYBIT_BASE_FEES.spot, 'maker', 'maker')).toBeNull();
    expect(roundTripFees(Number.NaN, BYBIT_BASE_FEES.spot, 'maker', 'maker')).toBeNull();
  });
});
