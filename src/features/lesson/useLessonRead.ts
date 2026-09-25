import { useEffect, useRef, useState, type RefObject } from 'react';
import type { LessonMeta } from '@/types/course';
import { isLessonRead } from '@/lib/progress/read';
import { useLessonTimer } from '@/hooks/useLessonTimer';
import { useProgress } from '@/store/progressStore';

/**
 * Tracks active time for the lesson and marks it read once the summary block was reached
 * and enough time passed (rule in lib/progress/read.ts). `ready` = MDX has rendered.
 */
export function useLessonRead(
  lesson: LessonMeta,
  articleRef: RefObject<HTMLElement | null>,
  ready: boolean,
): void {
  const addTime = useProgress((s) => s.addTime);
  const markRead = useProgress((s) => s.markRead);
  const alreadyRead = useProgress((s) => s.lessons[lesson.id]?.readAt !== undefined);
  const [summarySeen, setSummarySeen] = useState(false);
  const activeSec = useRef(0);
  // Time from earlier visits counts too (captured once: flushes during this visit update the store).
  const [priorSec] = useState(() => useProgress.getState().lessons[lesson.id]?.timeSpentSec ?? 0);

  useEffect(() => {
    if (!ready || alreadyRead || summarySeen) return;
    const summary = articleRef.current?.querySelector('[data-lesson-summary]');
    if (!summary || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setSummarySeen(true);
    });
    observer.observe(summary);
    return () => observer.disconnect();
  }, [ready, alreadyRead, summarySeen, articleRef]);

  const tryMarkRead = () => {
    if (!alreadyRead && isLessonRead(summarySeen, priorSec + activeSec.current, lesson.minutes)) {
      markRead(lesson.id);
    }
  };

  // Summary reached after the time threshold: mark immediately.
  useEffect(tryMarkRead);

  useLessonTimer({
    enabled: ready,
    onFlush: (seconds) => addTime(lesson.id, seconds),
    onTick: (seconds) => {
      activeSec.current = seconds;
      tryMarkRead();
    },
  });
}
