import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup, configure } from '@testing-library/react';

// Lazy routes and MDX chunks load slower when the whole suite runs in parallel.
configure({ asyncUtilTimeout: 5000 });

// jsdom has no canvas: confetti is purely decorative, so stub it everywhere.
vi.mock('canvas-confetti', () => ({ default: vi.fn(() => Promise.resolve()) }));

afterEach(() => {
  cleanup();
});

// jsdom has no ResizeObserver (used by charts to refit on layout changes).
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
