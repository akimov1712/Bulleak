import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Lightbulb, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { courseIndex } from '@/content/courseIndex';
import { skillIndex } from '@/content/skills';
import { answerEvents } from '@/lib/learner/events';
import { misconceptions } from '@/lib/learner/calibration';
import { contextTips, pickTip, TIP_SNOOZE_MS, type Tip } from '@/lib/hints/tips';
import { formatNumber } from '@/lib/format';
import { useProgress } from '@/store/progressStore';
import { useSettings } from '@/store/settingsStore';
import { paths } from '@/app/paths';
import type { SimTrade } from '@/types/trading';

// Per-browser convenience (which tips were hidden), not progress data.
const SNOOZE_KEY = 'tc-tips-snoozed';

function readSnoozed(): Record<string, number> {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(SNOOZE_KEY) ?? '{}');
    return raw && typeof raw === 'object' ? (raw as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeSnoozed(value: Record<string, number>) {
  try {
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(value));
  } catch {
    // not saved: the tip comes back next visit
  }
}

function TipText({ tip }: { tip: Tip }) {
  switch (tip.id) {
    case 'stop-moved':
      return (
        <>
          Ты отодвигал стоп от цены в {tip.count} сделках из {tip.of}. Стоп — это точка, где идея
          сделки неверна; если он «плавает», риск перестаёт быть известным заранее.
        </>
      );
    case 'revenge':
      return (
        <>
          В {tip.count} сделках из {tip.of} после убытка риск вырос. После минуса полезна пауза:
          следующая сделка — с тем же риском или меньше.
        </>
      );
    case 'low-rr':
      return (
        <>
          Плановое R:R в последних сделках — в среднем {formatNumber(tip.avgRr, 1)}. При таком
          соотношении нужно выигрывать очень часто; курс советует хотя бы 1,5–2.
        </>
      );
    case 'misconception': {
      const skill = skillIndex.getSkill(tip.skill);
      const lesson = courseIndex.getLesson(skill?.lessons[0] ?? '');
      return (
        <>
          В тесте по теме «{skill?.title ?? tip.skill}» был уверенный, но неверный ответ.{' '}
          {lesson && (
            <Link to={paths.lesson(lesson.id)} className="font-bold text-info underline">
              Перечитать урок
            </Link>
          )}
        </>
      );
    }
  }
}

/** One tip about the learner's own habits above the order panel (hints.md, section 4). */
export function TipCard({ trades }: { trades: readonly SimTrade[] }) {
  const attempts = useProgress((s) => s.quizAttempts);
  const [snoozed, setSnoozed] = useState(readSnoozed);
  const [now] = useState(() => Date.now());
  const enabled = useSettings((s) => s.hints === 'all');
  const tip = useMemo(() => {
    const open = [...misconceptions(answerEvents(attempts, skillIndex.skillsOfTags))];
    return pickTip(contextTips(trades, open), snoozed, now);
  }, [attempts, trades, snoozed, now]);
  if (!tip || !enabled) return null;
  return (
    <Card className="flex items-start gap-3" aria-label="Совет">
      <Lightbulb className="mt-0.5 size-5 shrink-0 text-xp" aria-hidden="true" />
      <p className="flex-1 text-sm">
        <TipText tip={tip} />
      </p>
      <IconButton
        label="Скрыть совет на неделю"
        icon={<X className="size-5" />}
        onClick={() => {
          const next = { ...snoozed, [tip.id]: Date.now() + TIP_SNOOZE_MS };
          writeSnoozed(next);
          setSnoozed(next);
        }}
      />
    </Card>
  );
}
