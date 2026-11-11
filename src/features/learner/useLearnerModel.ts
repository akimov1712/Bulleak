import { useMemo, useState } from 'react';
import { skillIndex } from '@/content/skills';
import { simRepo } from '@/db/simRepo';
import { useDbQuery } from '@/db/useDbQuery';
import { learnerModel } from '@/lib/learner/model';
import { answerEvents } from '@/lib/learner/events';
import { calibration, misconceptions, type Calibration } from '@/lib/learner/calibration';
import type { SkillState } from '@/lib/learner/gap';
import { useProgress } from '@/store/progressStore';
import type { SimTrade } from '@/types/trading';

export interface LearnerModelView {
  states: SkillState[];
  /** Trades could not be read (no IndexedDB): practice is unknown, not «no trades». */
  tradesMissing: boolean;
  calibration: Calibration;
  misconceptions: Set<string>;
}

/** The learner model for the current progress and simulator trades; undefined while loading. */
export function useLearnerModel(): LearnerModelView | undefined {
  const attempts = useProgress((s) => s.quizAttempts);
  const loaded = useDbQuery(() => simRepo.list().catch((): SimTrade[] | null => null), []);
  const [now] = useState(() => Date.now());
  return useMemo(() => {
    if (loaded === undefined) return undefined;
    const events = answerEvents(attempts, skillIndex.skillsOfTags);
    return {
      calibration: calibration(events),
      misconceptions: misconceptions(events),
      states: learnerModel({
        attempts,
        trades: loaded ?? [],
        skills: skillIndex.skills.map((s) => s.id),
        skillsOfTags: skillIndex.skillsOfTags,
        now,
      }),
      tradesMissing: loaded === null,
    };
  }, [attempts, loaded, now]);
}
