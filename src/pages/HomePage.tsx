import { useState } from 'react';
import { dayPart } from '@/lib/date';
import { BACKUP_SNOOZE_MS, nextStep, shouldRemindBackup } from '@/lib/progress/nextStep';
import { MascotSay } from '@/components/mascot/MascotSay';
import { Onboarding } from '@/features/home/Onboarding';
import { ContinueCard } from '@/features/home/ContinueCard';
import { TodayCard } from '@/features/home/TodayCard';
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
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold md:text-4xl">
          {GREETING[dayPart(now)]}, {profile.name}!
        </h1>
        <p className="text-lg text-text-muted">Шаг за шагом к своей стратегии.</p>
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
      <ContinueCard step={step} />
      <TodayCard />
      <RecentAchievements />
      <QuickLinks />
      <MascotSay mood="thinking" className="mt-2">
        Совет дня: один урок в день лучше, чем пять за выходные. Серия дней помогает не бросить.
      </MascotSay>
    </div>
  );
}
