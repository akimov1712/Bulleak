import { describe, expect, it } from 'vitest';
import { draftToTrade, emptyDraft, tradeToDraft, type JournalDraft } from './draft';

const NOW = new Date(2026, 8, 20, 10, 0).getTime();
const filled = (extra: Partial<JournalDraft> = {}): JournalDraft => ({
  ...emptyDraft(NOW),
  entry: 60_000,
  sl: 59_000,
  tp: 63_000,
  qty: 0.01,
  fees: 0.66,
  setup: ' tps ',
  tags: 'ретест, , 4H ',
  symbol: 'btcusdt',
  ...extra,
});

describe('draftToTrade', () => {
  it('builds an open trade without a result', () => {
    const r = draftToTrade(filled());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.trade).toMatchObject({ symbol: 'BTCUSDT', setup: 'tps', tags: ['ретест', '4H'] });
    expect(r.trade.pnl).toBeUndefined();
    expect(r.trade.exit).toBeUndefined();
    expect(r.trade.openedAt).toBe(NOW);
  });

  it('derives P&L and R for a closed trade', () => {
    const r = draftToTrade(filled({ exit: 62_000, closedAt: '2026-09-21T10:00' }));
    expect(r.ok && r.trade.pnl).toBeCloseTo(20 - 0.66);
    expect(r.ok && r.trade.r).toBeCloseTo((20 - 0.66) / 10);
  });

  it('puts a stop on the wrong side on the stop field', () => {
    const r = draftToTrade(filled({ sl: 61_000 }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.sl).toMatch(/по другую сторону/);
  });

  it('requires stop, qty, dates and a complete exit', () => {
    const r = draftToTrade(filled({ sl: null, qty: null, openedAt: '', exit: 61_000 }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(['closedAt', 'openedAt', 'qty', 'sl']);
    const bad = draftToTrade(filled({ exit: 61_000, closedAt: '2026-09-19T10:00' }));
    expect(!bad.ok && bad.errors.closedAt).toMatch(/раньше/);
  });

  it('round-trips through tradeToDraft', () => {
    const r = draftToTrade(filled({ exit: 62_000, closedAt: '2026-09-21T10:00' }));
    if (!r.ok) throw new Error('invalid');
    const again = draftToTrade(tradeToDraft({ ...r.trade, id: 1 }));
    expect(again).toEqual(r);
  });
});
