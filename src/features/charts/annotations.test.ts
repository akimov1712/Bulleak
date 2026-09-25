import { describe, expect, it } from 'vitest';
import type { Candle } from '@/types/trading';
import {
  buildMarkers,
  candleIndexAt,
  indicatorLabel,
  isPaneIndicator,
  labelSwings,
  parseTime,
  pricePrecision,
  readPalette,
  toChartTime,
  visibleRange,
  withAlpha,
} from './annotations';

const H = 3_600_000;
const candles: Candle[] = Array.from({ length: 10 }, (_, i) => ({
  t: i * H,
  o: 1,
  h: 2,
  l: 0,
  c: 1,
  v: 1,
}));

describe('time helpers', () => {
  it('parses ms, dates and UTC-less datetimes as UTC', () => {
    expect(parseTime(5)).toBe(5);
    expect(parseTime('2024-03-05')).toBe(Date.UTC(2024, 2, 5));
    expect(parseTime('2024-03-05T08:00')).toBe(Date.UTC(2024, 2, 5, 8));
    expect(parseTime('2024-03-05T08:00Z')).toBe(Date.UTC(2024, 2, 5, 8));
    expect(parseTime('2024-03-05T08:00+03:00')).toBe(Date.UTC(2024, 2, 5, 5));
    expect(() => parseTime('вчера')).toThrow(/Неверная дата/);
    expect(toChartTime(1500)).toBe(1);
  });

  it('candleIndexAt snaps to the candle containing t and clamps', () => {
    expect(candleIndexAt(candles, 3 * H + 5)).toBe(3);
    expect(candleIndexAt(candles, -1)).toBe(0);
    expect(candleIndexAt(candles, 99 * H)).toBe(9);
  });

  it('visibleRange supports from/to and bars', () => {
    expect(visibleRange(candles, {})).toEqual({ start: 0, end: 9 });
    expect(visibleRange(candles, { bars: 3 })).toEqual({ start: 7, end: 9 });
    expect(visibleRange(candles, { to: 5 * H, bars: 2 })).toEqual({ start: 4, end: 5 });
    expect(visibleRange(candles, { from: 2 * H, to: 4 * H })).toEqual({ start: 2, end: 4 });
    expect(visibleRange(candles, { from: 8 * H, to: 4 * H })).toEqual({ start: 4, end: 4 });
  });
});

describe('swings and markers', () => {
  it('labels swings relative to the previous one of the same kind', () => {
    const labelled = labelSwings([
      { index: 1, kind: 'high', price: 10 },
      { index: 2, kind: 'low', price: 5 },
      { index: 3, kind: 'high', price: 12 },
      { index: 4, kind: 'low', price: 6 },
      { index: 5, kind: 'high', price: 11 },
      { index: 6, kind: 'low', price: 4 },
    ]);
    expect(labelled.map((s) => s.label)).toEqual([null, null, 'HH', 'HL', 'LH', 'LL']);
  });

  it('builds explicit and swing markers sorted by index', () => {
    const highs = [1, 2, 5, 3, 2, 4, 6, 4, 3, 2];
    const zigzag = highs.map((h, i) => ({ t: i * H, o: h - 0.5, h, l: h - 1, c: h - 0.5, v: 1 }));
    const markers = buildMarkers(zigzag, [
      { type: 'marker', time: 8 * H, text: 'Вход' },
      { type: 'marker', time: 0, position: 'above', tone: 'bear' },
      { type: 'swings', n: 2 },
    ]);
    expect(markers).toEqual([
      { index: 0, position: 'aboveBar', shape: 'arrowDown', text: '', tone: 'bear' },
      { index: 6, position: 'aboveBar', shape: 'circle', text: 'HH', tone: 'bull' },
      { index: 8, position: 'belowBar', shape: 'arrowUp', text: 'Вход', tone: 'info' },
    ]);
  });
});

describe('misc', () => {
  it('indicator labels and pane detection', () => {
    expect(indicatorLabel({ type: 'ema', period: 20 })).toBe('EMA 20');
    expect(indicatorLabel({ type: 'sma', period: 50 })).toBe('SMA 50');
    expect(indicatorLabel({ type: 'bollinger' })).toBe('BB 20, 2');
    expect(indicatorLabel({ type: 'rsi' })).toBe('RSI 14');
    expect(indicatorLabel({ type: 'macd' })).toBe('MACD 12, 26, 9');
    expect(indicatorLabel({ type: 'atr', period: 7 })).toBe('ATR 7');
    expect(isPaneIndicator({ type: 'rsi' })).toBe(true);
    expect(isPaneIndicator({ type: 'ema', period: 9 })).toBe(false);
  });

  it('price precision by magnitude', () => {
    expect(pricePrecision(65000)).toBe(1);
    expect(pricePrecision(2500)).toBe(2);
    expect(pricePrecision(150)).toBe(2);
    expect(pricePrecision(1.5)).toBe(3);
    expect(pricePrecision(0.2)).toBe(5);
  });

  it('withAlpha converts hex and passes other formats through', () => {
    expect(withAlpha('#ff0080', 0.5)).toBe('rgba(255, 0, 128, 0.5)');
    expect(withAlpha('rgb(1 2 3)', 0.5)).toBe('rgb(1 2 3)');
  });

  it('readPalette reads CSS variables with fallbacks', () => {
    const el = document.createElement('div');
    el.style.setProperty('--bull', '#00ff00');
    document.body.append(el);
    const p = readPalette(el);
    expect(p.tones.bull).toBe('#00ff00');
    expect(p.tones.bear).toBe('#888888');
    expect(p.surface).toBe('#ffffff');
    el.remove();
  });
});
