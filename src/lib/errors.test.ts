import { describe, expect, it } from 'vitest';
import { errorDetails, isStaleChunkError } from './errors';

describe('errorDetails', () => {
  it('lists the error, the start of the stack, the URL and the browser', () => {
    const error = new TypeError('boom');
    const text = errorDetails(error, 'http://x/#/lesson/m01-l01', 'TestAgent');
    expect(text.startsWith('TypeError: boom')).toBe(true);
    expect(text).toContain('URL: http://x/#/lesson/m01-l01');
    expect(text).toContain('Браузер: TestAgent');
    expect(text.split('\n').length).toBeLessThanOrEqual(12);
  });

  it('handles non-Error values', () => {
    expect(errorDetails('oops', 'u', 'a').split('\n')[0]).toBe('oops');
  });
});

describe('isStaleChunkError', () => {
  it('recognises a missing chunk after a deploy', () => {
    expect(
      isStaleChunkError(new TypeError('Failed to fetch dynamically imported module: /a.js')),
    ).toBe(true);
    expect(isStaleChunkError(new Error('Importing a module script failed.'))).toBe(true);
    expect(isStaleChunkError(new Error('Cannot read properties of null'))).toBe(false);
    expect(isStaleChunkError('x')).toBe(false);
  });
});
