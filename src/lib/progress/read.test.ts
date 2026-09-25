import { describe, expect, it } from 'vitest';
import {
  IDLE_AFTER_MS,
  isLessonRead,
  MAX_TICK_MS,
  noteActivity,
  readThresholdSec,
  startClock,
  tick,
} from './read';

describe('activity clock', () => {
  it('counts visible, recently active time', () => {
    let c = startClock(0);
    c = tick(c, 1000, true);
    c = tick(c, 2000, true);
    expect(c.activeMs).toBe(2000);
  });

  it('does not count hidden tabs', () => {
    let c = startClock(0);
    c = tick(c, 1000, false);
    expect(c.activeMs).toBe(0);
    expect(c.lastTickAt).toBe(1000);
  });

  it('stops counting after the idle timeout and resumes on activity', () => {
    let c = startClock(0);
    c = tick(c, IDLE_AFTER_MS, true); // still active at exactly 60 s (capped per tick)
    expect(c.activeMs).toBe(MAX_TICK_MS);
    c = tick(c, IDLE_AFTER_MS + 1000, true); // idle now
    expect(c.activeMs).toBe(MAX_TICK_MS);
    c = noteActivity(c, IDLE_AFTER_MS + 1000);
    c = tick(c, IDLE_AFTER_MS + 2000, true);
    expect(c.activeMs).toBe(MAX_TICK_MS + 1000);
  });

  it('caps a single long tick (sleep) and ignores clock going backwards', () => {
    let c = startClock(0);
    c = tick(c, 3000, true);
    c = noteActivity(c, 3000);
    c = tick(c, 3100, true);
    expect(c.activeMs).toBe(3100);
    c = tick(c, 1000, true);
    expect(c.activeMs).toBe(3100);
  });
});

describe('read rule', () => {
  it.each([
    [10, 60],
    [3, 54],
    [1, 18],
    [0, 0],
    [-5, 0],
  ])('threshold for %s min = %s s', (minutes, expected) => {
    expect(readThresholdSec(minutes)).toBeCloseTo(expected);
  });

  it('needs both the summary and enough time', () => {
    expect(isLessonRead(true, 60, 10)).toBe(true);
    expect(isLessonRead(true, 59, 10)).toBe(false);
    expect(isLessonRead(false, 600, 10)).toBe(false);
  });
});
