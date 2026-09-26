import { describe, expect, it } from 'vitest';
import { fillMarketOrder, spread } from './orderbook';

const asks = [
  { price: 100, qty: 1 },
  { price: 101, qty: 2 },
  { price: 103, qty: 1 },
];

describe('fillMarketOrder', () => {
  it('fills from the best level only when it is deep enough', () => {
    const r = fillMarketOrder(asks, 0.5);
    expect(r.fills).toEqual([{ price: 100, qty: 0.5 }]);
    expect(r.avgPrice).toBe(100);
    expect(r.slippagePct).toBe(0);
  });

  it('walks several levels and reports the average price and slippage', () => {
    const r = fillMarketOrder(asks, 2.5);
    expect(r.fills).toEqual([
      { price: 100, qty: 1 },
      { price: 101, qty: 1.5 },
    ]);
    expect(r.cost).toBeCloseTo(251.5);
    expect(r.avgPrice).toBeCloseTo(100.6);
    expect(r.slippagePct).toBeCloseTo(0.6);
    expect(r.unfilledQty).toBe(0);
  });

  it('reports the unfilled part when the book is too thin', () => {
    const r = fillMarketOrder(asks, 5);
    expect(r.filledQty).toBe(4);
    expect(r.unfilledQty).toBe(1);
  });

  it('handles zero / negative quantity and an empty book', () => {
    expect(fillMarketOrder(asks, 0)).toMatchObject({ fills: [], avgPrice: null, slippagePct: 0 });
    expect(fillMarketOrder(asks, -1).filledQty).toBe(0);
    expect(fillMarketOrder([], 1)).toMatchObject({ unfilledQty: 1, avgPrice: null });
  });

  it('works for sells against bids (descending prices)', () => {
    const bids = [
      { price: 99, qty: 1 },
      { price: 98, qty: 1 },
    ];
    const r = fillMarketOrder(bids, 2);
    expect(r.avgPrice).toBe(98.5);
    expect(r.slippagePct).toBeCloseTo((0.5 / 99) * 100);
  });
});

describe('spread', () => {
  it('absolute and percent of mid', () => {
    expect(spread(99, 101)).toEqual({ abs: 2, pct: 2 });
    expect(spread(0, 0).pct).toBe(0);
  });
});
