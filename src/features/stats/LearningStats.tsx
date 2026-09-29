import { useState } from 'react';
import { Link } from 'react-router';
import { paths } from '@/app/paths';
import { Mascot } from '@/components/mascot/Mascot';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { EmptyState } from '@/components/ui/Skeleton';
import { moduleColors } from '@/components/ui/moduleColors';
import { courseIndex } from '@/content/courseIndex';
import { getTerm } from '@/content/glossary';
import { useToday } from '@/hooks/useToday';
import { useUnlockContext } from '@/hooks/useUnlock';
import { fromDateKey } from '@/lib/date';
import { formatDuration, formatNumber, formatPct } from '@/lib/format';
import { levelFromXp } from '@/lib/gamification/levels';
import { moduleCompletion } from '@/lib/progress/unlock';
import { heatmap, learningSummary, tagAccuracy, xpByDay } from '@/lib/stats/learning';
import { useProgress } from '@/store/progressStore';
import { Bars, HBar, Heatmap } from './charts';
import { WeakTopics } from './WeakTopics';

const dayFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
const dateTimeFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/** Human name of a quiz attempt: lesson title, module exam or the final exam. */
function quizName(quizId: string): string {
  if (quizId === 'final') return 'Финальный экзамен';
  if (quizId.endsWith('-exam')) {
    const module = courseIndex.getModule(quizId.replace('-exam', ''));
    return `Экзамен: ${module?.title ?? quizId}`;
  }
  return courseIndex.getLesson(quizId)?.title ?? quizId;
}

export function LearningStats() {
  const progress = useProgress();
  const ctx = useUnlockContext();
  const today = useToday();
  const [days, setDays] = useState<'7' | '30' | '90'>('30');
  const summary = learningSummary(progress);
  const level = levelFromXp(progress.xp);
  const totalLessons = courseIndex.lessons.length;

  if (progress.xp === 0 && progress.quizAttempts.length === 0) {
    return (
      <EmptyState
        art={<Mascot mood="thinking" size={120} />}
        title="Статистики пока нет"
        description="Пройди первый урок и тест — здесь появятся XP по дням, календарь и точность по темам."
        action={
          <Link to={paths.path()} className="font-bold text-info underline">
            К карте курса
          </Link>
        }
      />
    );
  }

  const xpDays = xpByDay(progress.activity, today, Number(days));
  const accuracy = tagAccuracy(progress.quizAttempts);
  const tiles: [string, string][] = [
    ['Опыт', `${formatNumber(summary.xp, 0)} XP`],
    ['Уровень', `${level.level} · ${level.rank}`],
    ['Уроков пройдено', `${summary.lessonsCompleted} / ${totalLessons}`],
    ['Средний балл тестов', formatPct(summary.avgQuizBest, 0)],
    ['Время в уроках', formatDuration(summary.timeSec)],
    ['Серия дней', `${summary.streakCurrent} (лучшая ${summary.streakLongest})`],
  ];

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tiles.map(([label, value]) => (
          <Card key={label} padding="sm">
            <dt className="text-sm font-bold text-text-muted">{label}</dt>
            <dd className="text-lg font-extrabold tabular-nums">{value}</dd>
          </Card>
        ))}
      </dl>

      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-extrabold">XP по дням</h2>
          <Segmented
            label="Период"
            hideLabel
            value={days}
            options={[
              { value: '7', label: '7 дней' },
              { value: '30', label: '30 дней' },
              { value: '90', label: '90 дней' },
            ]}
            onChange={setDays}
          />
        </div>
        <Bars
          values={xpDays.map((d) => d.xp)}
          labels={xpDays.map((d) => `${dayFormat.format(fromDateKey(d.key))}: ${d.xp} XP`)}
          label={`XP за последние ${days} дней, всего ${xpDays.reduce((s, d) => s + d.xp, 0)}`}
        />
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-extrabold">Календарь активности</h2>
        <Heatmap weeks={heatmap(progress.activity, today, 26)} />
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-extrabold">Прогресс по модулям</h2>
        {courseIndex.modules.map((m) => {
          const c = moduleCompletion(ctx, m);
          return (
            <HBar
              key={m.id}
              label={`${m.index}. ${m.title}`}
              value={c.ratio}
              text={`${c.done} / ${c.total}`}
              barClass={moduleColors[m.color].bg}
            />
          );
        })}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-extrabold">Точность по темам</h2>
        {accuracy.length === 0 ? (
          <p className="text-text-muted">Появится после первых тестов.</p>
        ) : (
          <>
            <WeakTopics />
            {accuracy.slice(0, 15).map((a) => (
              <HBar
                key={a.tag}
                label={getTerm(a.tag)?.term ?? a.tag}
                value={a.ratio}
                text={`${formatPct(a.ratio, 0)} · ${a.correct}/${a.total}`}
                barClass={a.ratio >= 0.8 ? 'bg-bull' : a.ratio >= 0.5 ? 'bg-warn' : 'bg-bear'}
              />
            ))}
          </>
        )}
      </Card>

      {progress.quizAttempts.length > 0 && (
        <Card
          className="flex flex-col gap-2 overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label="Последние тесты"
        >
          <h2 className="font-extrabold">Последние тесты</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-muted">
                <th className="font-bold">Когда</th>
                <th className="font-bold">Тест</th>
                <th className="text-right font-bold">Результат</th>
              </tr>
            </thead>
            <tbody>
              {[...progress.quizAttempts]
                .reverse()
                .slice(0, 20)
                .map((a) => (
                  <tr key={`${a.quizId}-${a.at}`} className="border-t border-border">
                    <td className="py-1 whitespace-nowrap">{dateTimeFormat.format(a.at)}</td>
                    <td className="py-1">{quizName(a.quizId)}</td>
                    <td
                      className={
                        a.passed
                          ? 'text-right font-bold text-bull'
                          : 'text-right font-bold text-bear'
                      }
                    >
                      {formatPct(a.ratio, 0)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
