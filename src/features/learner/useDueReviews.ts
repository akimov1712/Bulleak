import { useMemo } from 'react';
import { skillIndex } from '@/content/skills';
import { answerEvents } from '@/lib/learner/events';
import { knowledgeBySkill } from '@/lib/learner/knowledge';
import { dueReviews, reviewSchedule, type ReviewItem } from '@/lib/learner/review';
import { useProgress } from '@/store/progressStore';
import { useToday } from '@/hooks/useToday';
import { addDays, fromDateKey } from '@/lib/date';
import type { SkillKnowledge } from '@/lib/learner/knowledge';

export interface DueReview extends ReviewItem {
  title: string;
  knowledge?: SkillKnowledge;
}

/** Skills due for review by the end of today (recomputed when attempts change or the day turns). */
export function useDueReviews(): DueReview[] {
  const attempts = useProgress((s) => s.quizAttempts);
  const today = useToday();
  return useMemo(() => {
    // «Today» = due before the day ends; also keeps the memo pure.
    const now = fromDateKey(addDays(today, 1)).getTime() - 1;
    const events = answerEvents(attempts, skillIndex.skillsOfTags);
    const knowledge = knowledgeBySkill(events, now);
    return dueReviews(reviewSchedule(events), knowledge, now).map((item) => ({
      ...item,
      title: skillIndex.getSkill(item.skill)?.title ?? item.skill,
      knowledge: knowledge.get(item.skill),
    }));
  }, [attempts, today]);
}
