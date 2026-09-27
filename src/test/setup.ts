import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup, configure } from '@testing-library/react';

// Lazy routes and MDX chunks load slower when the whole suite runs in parallel.
configure({ asyncUtilTimeout: 5000 });

// jsdom has no canvas: confetti is purely decorative, so stub it everywhere.
vi.mock('canvas-confetti', () => ({ default: vi.fn(() => Promise.resolve()) }));

// Time-of-day achievements (early bird, night owl) would fire depending on when the suite runs:
// pin the clock to noon of the current day. Only Date is faked, timers stay real.
beforeEach(() => {
  const noon = new Date();
  noon.setHours(12, 0, 0, 0);
  vi.useFakeTimers({ toFake: ['Date'], now: noon });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// jsdom has no ResizeObserver (used by charts to refit on layout changes).
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
