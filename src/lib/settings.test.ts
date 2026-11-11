import { describe, expect, it } from 'vitest';
import { sanitizeSettings } from './settings';

describe('sanitizeSettings', () => {
  it('keeps valid hint level and tours, drops the rest', () => {
    expect(sanitizeSettings({ hints: 'less', toursSeen: ['home', 'home', 'x', 3] })).toEqual({
      hints: 'less',
      toursSeen: ['home'],
    });
    expect(sanitizeSettings({ hints: 'some', toursSeen: 'home' })).toEqual({});
  });
});
