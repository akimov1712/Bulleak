import { useState } from 'react';
import { dayPart } from '@/lib/date';
import { BACKUP_SNOOZE_MS, nextStep, shouldRemindBackup } from '@/lib/progress/nextStep';
import { Onboarding } from '@/features/home/Onboarding';
import { ContinueCard } from '@/features/home/ContinueCard';
import { TodayCard } from '@/features/home/TodayCard';
import { ModulesCard } from '@/features/home/ModulesCard';
import { courseCompletion, currentLesson } from '@/lib/progress/unlock';
import { BackupReminder, QuickLinks, RecentAchievements } from '@/features/home/HomeExtras';
import { useUnlockContext } from '@/hooks/useUnlock';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useProgress } from '@/store/progressStore';

const GREETING = {
  night: 'Доброй ночи',
  morning: 'Доброе утро',
  day: 'Добрый день',
  evening: 'Добрый вечер',
} as const;

// Per-browser convenience (not progress data), so plain localStorage is fine.
const SNOOZE_KEY = 'tc-backup-snooze';

function readSnooze(): number {
  try {
    return Number(localStorage.getItem(SNOOZE_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeSnooze(until: number): void {
  try {
    localStorage.setItem(SNOOZE_KEY, String(until));
  } catch {
    // not persisted; the reminder just comes back next visit
  }
}

export function HomePage() {
  usePageTitle('Главная');
  const profile = useProgress((s) => s.profile);
  const xp = useProgress((s) => s.xp);
  const ctx = useUnlockContext();
  // The moment the page opened (greeting and reminders do not need to tick).
  const [now] = useState(() => Date.now());
  const [snoozedUntil, setSnoozedUntil] = useState(readSnooze);

  if (!profile.name) return <Onboarding />;

  const step = nextStep(ctx);
  const { done, total } = courseCompletion(ctx);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {GREETING[dayPart(now)]}, {profile.name}!
        </h1>
        <p className="text-text-muted">Шаг за шагом к своей стратегии.</p>
      </div>
      {shouldRemindBackup(profile, xp, now, snoozedUntil) && (
        <BackupReminder
          onSnooze={() => {
            const until = Date.now() + BACKUP_SNOOZE_MS;
            writeSnooze(until);
            setSnoozedUntil(until);
          }}
        />
      )}
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-8">
          <ContinueCard step={step} done={done} total={total} />
          <ModulesCard ctx={ctx} current={currentLesson(ctx)?.moduleId} />
        </div>
        <div className="flex flex-col gap-5 lg:col-span-4">
          <TodayCard />
          <QuickLinks />
        </div>
      </div>
      <RecentAchievements />
    </div>
  );
}
