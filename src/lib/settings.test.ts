import { describe, expect, it } from 'vitest';
import { sanitizeSettings, settingsForSync, settingsFromSync } from './settings';

describe('sanitizeSettings', () => {
  it('keeps valid hint level and tours, drops the rest', () => {
    expect(sanitizeSettings({ hints: 'less', toursSeen: ['home', 'home', 'x', 3] })).toEqual({
      hints: 'less',
      toursSeen: ['home'],
    });
    expect(sanitizeSettings({ hints: 'some', toursSeen: 'home' })).toEqual({});
  });
});

describe('synced settings', () => {
  it('marks what is sent with the document version', () => {
    expect(settingsForSync({ sound: false, junk: 1 })).toEqual({ sound: false, schema: 2 });
  });

  it('keeps choices from a current document and upgrades an old one', () => {
    expect(settingsFromSync({ sound: false, reducedMotion: 'off', schema: 2 })).toEqual({
      sound: false,
      reducedMotion: 'off',
    });
    expect(settingsFromSync({ sound: false, reducedMotion: 'system', theme: 'light' })).toEqual({
      theme: 'light',
      sound: true,
      reducedMotion: 'on',
    });
  });
});
