import { describe, expect, it } from 'vitest';
import { csvField, journalCsv, simTradesCsv, toCsv } from './csv';

describe('csv', () => {
  it('quotes fields with separators, quotes and line breaks; decimal comma', () => {
    expect(csvField('plain')).toBe('plain');
    expect(csvField('a;b')).toBe('"a;b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField('two\nlines')).toBe('"two\nlines"');
    expect(csvField(1.5)).toBe('1,5');
    expect(csvField(undefined)).toBe('');
  });

  it('starts with a BOM and ends lines with CRLF', () => {
    const text = toCsv(['a', 'b'], [[1, 'x']]);
    expect(text.charCodeAt(0)).toBe(0xfeff);
    expect(text.slice(1)).toBe('a;b\r\n1;x\r\n');
  });

  it('exports trades without deleted records', () => {
    const sim = simTradesCsv([
      {
        at: Date.UTC(2026, 10, 1),
        scenarioId: null,
        dataset: 'BTCUSDT-240',
        startIndex: 1,
        side: 'long',
        entry: 100,
        sl: 95,
        tp: 110,
        riskPct: 1,
        balanceBefore: 1000,
        qty: 2,
        exitPrice: 110,
        exitIndex: 5,
        outcome: 'tp',
        pnl: 20,
        r: 2,
        fees: 0,
        actions: [{ index: 3, kind: 'move-sl', price: 100 }],
      },
    ]);
    expect(sim.split('\r\n')[1]).toBe(
      '2026-11-01T00:00:00.000Z;BTCUSDT-240;;;long;100;95;110;1;2;110;tp;20;2;0;move-sl@100',
    );
    expect(journalCsv([]).split('\r\n')).toHaveLength(2);
  });
});
