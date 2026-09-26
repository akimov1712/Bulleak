import { Link } from 'react-router';
import { ArrowLeft, ArrowRight, ClipboardCheck, Trophy } from 'lucide-react';
import { buttonClass } from '@/components/ui/styles';
import { Card } from '@/components/ui/Card';
import { paths } from '@/app/paths';
import { formatPct } from '@/lib/format';
import type { LessonMeta, ModuleId } from '@/types/course';
import type { LessonProgress, LessonStatus } from '@/types/progress';

interface LessonFooterProps {
  lesson: LessonMeta;
  status: LessonStatus;
  progress?: LessonProgress;
  prev?: LessonMeta;
  next?: LessonMeta;
  nextUnlocked: boolean;
  /** Set when the next lesson is in the following module, which opens only after this exam. */
  examModuleId?: ModuleId;
  /** The module exam can be taken now. */
  examOpen?: boolean;
}

export function LessonFooter({
  lesson,
  status,
  progress,
  prev,
  next,
  nextUnlocked,
  examModuleId,
  examOpen = false,
}: LessonFooterProps) {
  const completed = status === 'completed';
  return (
    <div className="mt-10 flex flex-col gap-6">
      <Card className="flex flex-col items-start gap-4 border-primary sm:flex-row sm:items-center">
        <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary text-on-primary">
          {completed ? (
            <Trophy className="size-7" aria-hidden="true" />
          ) : (
            <ClipboardCheck className="size-7" aria-hidden="true" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-lg font-extrabold">{completed ? 'Тест сдан!' : 'Проверь себя'}</p>
          <p className="text-text-muted">
            {completed
              ? `Лучший результат — ${formatPct(progress?.quizBest ?? 0, 0)}. Можно пересдать и улучшить.`
              : 'Короткий тест по уроку. Для сдачи нужно 80% правильных ответов.'}
          </p>
        </div>
        <Link
          to={paths.lessonQuiz(lesson.id)}
          className={buttonClass({ size: 'lg', variant: completed ? 'secondary' : 'primary' })}
        >
          {completed ? 'Пересдать' : 'Пройти тест'}
        </Link>
      </Card>

      <nav
        aria-label="Соседние уроки"
        // min-w-0: grid items default to min-width:auto, which defeats `truncate` on long titles.
        className="grid gap-3 sm:grid-cols-2 [&>*]:min-w-0"
      >
        {prev ? (
          <Link
            to={paths.lesson(prev.id)}
            className="group flex items-center gap-3 rounded-2xl border-2 border-border p-4 hover:bg-surface-2"
          >
            <ArrowLeft className="size-5 shrink-0 text-text-muted" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-xs font-bold text-text-muted">Предыдущий урок</span>
              <span className="block truncate font-extrabold">{prev.title}</span>
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next &&
          (nextUnlocked ? (
            <Link
              to={paths.lesson(next.id)}
              className="flex items-center justify-end gap-3 rounded-2xl border-2 border-border p-4 text-right hover:bg-surface-2"
            >
              <span className="min-w-0">
                <span className="block text-xs font-bold text-text-muted">Следующий урок</span>
                <span className="block truncate font-extrabold">{next.title}</span>
              </span>
              <ArrowRight className="size-5 shrink-0 text-text-muted" aria-hidden="true" />
            </Link>
          ) : examModuleId && examOpen ? (
            <Link
              to={paths.exam(examModuleId)}
              className={buttonClass({ variant: 'xp', size: 'lg' })}
            >
              <Trophy className="size-5" aria-hidden="true" />К экзамену модуля
            </Link>
          ) : (
            <p className="flex items-center justify-end rounded-2xl border-2 border-dashed border-border p-4 text-right text-sm text-text-muted">
              {examModuleId
                ? completed
                  ? 'Следующий модуль откроется после экзамена этого модуля'
                  : 'Дальше — тест этого урока, а затем экзамен модуля'
                : 'Следующий урок откроется после сдачи теста'}
            </p>
          ))}
      </nav>
    </div>
  );
}
