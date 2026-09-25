import { useMemo } from 'react';
import { courseIndex } from '@/content/courseIndex';
import { useProgress } from '@/store/progressStore';
import { useSettings } from '@/store/settingsStore';
import type { UnlockContext } from '@/lib/progress/unlock';

/** Unlock context from the live stores (re-computed only when lessons/exams/freeMode change). */
export function useUnlockContext(): UnlockContext {
  const lessons = useProgress((s) => s.lessons);
  const exams = useProgress((s) => s.exams);
  const freeMode = useSettings((s) => s.freeMode);
  return useMemo(
    () => ({ course: courseIndex, progress: { lessons, exams }, freeMode }),
    [lessons, exams, freeMode],
  );
}
