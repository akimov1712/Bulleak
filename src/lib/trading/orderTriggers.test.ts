import { describe, expect, it } from 'vitest';
import { isTriggered, moveTo, startWalk, type RestingOrder } from './orderTriggers';

const order = (kind: RestingOrder['kind'], price: number): RestingOrder => ({
  id: kind,
  kind,
  price,
});

describe('isTriggered', () => {
  it('buy limits and stop-sells fire on a drop to the level', () => {
    expect(isTriggered(order('limit-buy', 95), 95, 100)).toBe(true);
    expect(isTriggered(order('limit-buy', 95), 96, 100)).toBe(false);
    expect(isTriggered(order('stop-sell', 90), 89, 100)).toBe(true);
  });

  it('sell limits and stop-buys fire on a rise to the level', () => {
    expect(isTriggered(order('limit-sell', 105), 100, 105)).toBe(true);
    expect(isTriggered(order('stop-buy', 110), 100, 109.9)).toBe(false);
  });
});

describe('price walk', () => {
  it('remembers the visited range, so a touched level stays triggered', () => {
    let walk = startWalk(100);
    walk = moveTo(walk, 94);
    walk = moveTo(walk, 103);
    expect(walk).toEqual({ low: 94, high: 103, current: 103 });
    expect(isTriggered(order('limit-buy', 95), walk.low, walk.high)).toBe(true);
  });
});
