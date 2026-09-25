import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { useLessonRead } from './useLessonRead';
import { useProgress } from '@/store/progressStore';
import { courseIndex } from '@/content/courseIndex';
import type { LessonMeta } from '@/types/course';

const found = courseIndex.getLesson('m00-l01');
if (!found) throw new Error('fixture lesson missing');
const lesson: LessonMeta = found;

let intersect: (() => void) | null = null;

class FakeIntersectionObserver {
  constructor(private cb: IntersectionObserverCallback) {}
  observe() {
    intersect = () =>
      this.cb(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
  }
  disconnect() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
}

function Harness({ ready = true }: { ready?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  useLessonRead(lesson, ref, ready);
  return (
    <article ref={ref}>
      <section data-lesson-summary>Итоги</section>
    </article>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  useProgress.getState().reset();
  intersect = null;
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Advance time second by second while simulating user activity. */
function readFor(seconds: number) {
  for (let i = 0; i < seconds; i++) {
    act(() => {
      window.dispatchEvent(new Event('scroll'));
      vi.advanceTimersByTime(1000);
    });
  }
}

describe('useLessonRead', () => {
  it('marks read only after the summary is seen and the time threshold passes', () => {
    render(<Harness />);
    act(() => intersect?.());
    readFor(20);
    expect(useProgress.getState().lessons['m00-l01']?.readAt).toBeUndefined();
    readFor(45); // m00-l01: 8 min → threshold min(60, 144) = 60 s
    expect(useProgress.getState().lessons['m00-l01']?.readAt).toBeTypeOf('number');
  });

  it('counts active time from earlier visits', () => {
    useProgress.getState().addTime('m00-l01', 40);
    render(<Harness />);
    act(() => intersect?.());
    readFor(25); // 40 s earlier + 25 s now ≥ 60 s
    expect(useProgress.getState().lessons['m00-l01']?.readAt).toBeTypeOf('number');
  });

  it('does not mark read without reaching the summary', () => {
    render(<Harness />);
    readFor(90);
    expect(useProgress.getState().lessons['m00-l01']?.readAt).toBeUndefined();
  });

  it('flushes active time every 15 s and on unmount', () => {
    const { unmount } = render(<Harness />);
    readFor(16);
    expect(useProgress.getState().lessons['m00-l01']?.timeSpentSec).toBe(15);
    readFor(4);
    unmount();
    expect(useProgress.getState().lessons['m00-l01']?.timeSpentSec).toBe(20);
  });

  it('does not count idle time', () => {
    const { unmount } = render(<Harness />);
    act(() => {
      vi.advanceTimersByTime(180_000); // no activity events for 3 minutes
    });
    unmount();
    expect(useProgress.getState().lessons['m00-l01']?.timeSpentSec ?? 0).toBeLessThanOrEqual(60);
  });

  it('does nothing until content is ready', () => {
    const { unmount } = render(<Harness ready={false} />);
    readFor(30);
    unmount();
    expect(useProgress.getState().lessons['m00-l01']).toBeUndefined();
  });
});
