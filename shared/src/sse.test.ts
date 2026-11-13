import { describe, expect, it } from 'vitest';
import { createSseParser } from './sse';

describe('createSseParser', () => {
  it('assembles events split across chunks', () => {
    const p = createSseParser();
    expect(p.push('event: delta\nda')).toEqual([]);
    expect(p.push('ta: {"text":"При"}\n\ndata: a\r\ndata: b\r\n\r\n: ping\n\n')).toEqual([
      { event: 'delta', data: '{"text":"При"}' },
      { event: 'message', data: 'a\nb' },
    ]);
  });

  it('flushes the last event at the end of the stream', () => {
    const p = createSseParser();
    expect(p.push('data: [DONE]')).toEqual([]);
    expect(p.end()).toEqual([{ event: 'message', data: '[DONE]' }]);
    expect(p.end()).toEqual([]);
  });
});
