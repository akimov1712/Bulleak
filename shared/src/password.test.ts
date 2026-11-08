import { describe, expect, it } from 'vitest';
import { isWeakPassword } from './password';

describe('isWeakPassword', () => {
  it.each([
    'password',
    'PASSWORD',
    '12345678',
    'qwerty2024',
    'bybit2024!',
    'йцукенгшщз',
    'пароль123',
  ])('rejects the common password %s', (password) => {
    expect(isWeakPassword(password)).toBe(true);
  });

  it('rejects repeats and digit runs', () => {
    expect(isWeakPassword('aaaaaaaa')).toBe(true);
    expect(isWeakPassword('abababab')).toBe(true);
    expect(isWeakPassword('23456789')).toBe(true);
    expect(isWeakPassword('98765432')).toBe(true);
  });

  it('rejects passwords made of the e-mail or the name', () => {
    expect(isWeakPassword('marketmaker', 'marketmaker@mail.test')).toBe(true);
    expect(isWeakPassword('Marketmaker99', 'marketmaker@mail.test')).toBe(true);
    expect(isWeakPassword('Степанида1', 'a@b.test', 'Степанида')).toBe(true);
  });

  it('accepts unrelated passwords', () => {
    expect(isWeakPassword('correct horse battery')).toBe(false);
    expect(isWeakPassword('T7#mVq2!xL')).toBe(false);
    // Contains the name but is more than the name.
    expect(isWeakPassword('anna-likes-long-walks', 'x@y.test', 'Anna')).toBe(false);
  });
});
