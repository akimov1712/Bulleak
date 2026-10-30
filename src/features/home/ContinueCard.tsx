import { Link } from 'react-router';
import { GraduationCap, PartyPopper, Trophy } from 'lucide-react';
import { cn } from '@/lib/cn';
import { courseIndex } from '@/content/courseIndex';
import { buttonClass, cardClass } from '@/components/ui/styles';
import { paths } from '@/app/paths';
import type { NextStep } from '@/lib/progress/nextStep';

/** Decorative candles in the corner of the card (bull / bear colours from the theme). */
const CANDLES: [number, number, number, number, number, boolean][] = [
  // x, wick top, wick bottom, body top, body height, bullish
  [10, 40, 110, 55, 40, false],
  [40, 60, 125, 75, 35, true],
  [70, 45, 100, 55, 35, true],
  [100, 30, 80, 40, 25, false],
  [130, 35, 90, 45, 30, true],
  [160, 20, 70, 28, 32, true],
  [190, 15, 55, 22, 20, false],
  [220, 10, 45, 14, 25, true],
];

function Candles() {
  return (
    <svg
      viewBox="0 0 240 135"
      className="pointer-events-none absolute top-6 right-6 hidden h-32 w-56 opacity-80 md:block"
      aria-hidden="true"
    >
      {CANDLES.map(([x, top, bottom, bodyTop, bodyH, bull]) => (
        <g key={x} className={bull ? 'fill-bull stroke-bull' : 'fill-bear stroke-bear'}>
          <line x1={x + 6} x2={x + 6} y1={top} y2={bottom} strokeWidth="2" />
          <rect x={x} y={bodyTop} width="12" height={bodyH} rx="2" />
        </g>
      ))}
    </svg>
  );
}

function CourseBar({ done, total }: { done: number; total: number }) {
  const ratio = total ? done / total : 0;
  return (
    <div className="mt-auto flex flex-col gap-2 pt-2">
      <div
        className="h-1.5 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-label="Пройдено уроков курса"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-text-muted">
        <span>Курс пройден на {Math.round(ratio * 100)}%</span>
        <span className="font-mono tabular-nums">
          {done} / {total} уроков
        </span>
      </div>
    </div>
  );
}

/** "What's next" card on the home page, with the course progress. */
export function ContinueCard({
  step,
  done,
  total,
}: {
  step: NextStep;
  done: number;
  total: number;
}) {
  const box = cn(cardClass(), 'relative flex flex-col gap-4 overflow-hidden p-5 md:p-6');

  if (step.kind === 'lesson') {
    const module = courseIndex.getModule(step.lesson.moduleId);
    const fresh = step.lesson.id === 'm00-l01' && step.status === 'available';
    const read = step.status === 'read';
    return (
      <section aria-label="Продолжить обучение" className={box}>
        <Candles />
        <div className="flex flex-col gap-2 md:max-w-[calc(100%-15rem)]">
          <p className="text-xs font-medium tracking-[0.14em] text-text-muted uppercase">
            {fresh ? 'Начни отсюда' : 'Продолжить'} · Модуль {module?.index} · {module?.title}
          </p>
          <h2 className="text-2xl leading-tight font-semibold tracking-tight md:text-[1.75rem]">
            {step.lesson.title}
          </h2>
          <p className="text-text-muted">
            Урок {module?.index}.{step.lesson.index} ·{' '}
            {read ? 'прочитан — остался тест' : `~${step.lesson.minutes} минут`}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to={read ? paths.lessonQuiz(step.lesson.id) : paths.lesson(step.lesson.id)}
            className={buttonClass()}
          >
            {read ? 'Пройти тест' : fresh ? 'Начать первый урок' : 'Продолжить урок'}
          </Link>
          <Link to={paths.path()} className={buttonClass({ variant: 'secondary' })}>
            Карта курса
          </Link>
        </div>
        <CourseBar done={done} total={total} />
      </section>
    );
  }

  const { icon, title, text, to, action } =
    step.kind === 'exam'
      ? {
          icon: <Trophy className="size-5" aria-hidden="true" />,
          title: `Экзамен модуля ${step.module.index}`,
          text: `Все уроки «${step.module.title}» пройдены — сдай экзамен, чтобы открыть следующий модуль.`,
          to: paths.exam(step.module.id),
          action: 'Сдать экзамен',
        }
      : step.kind === 'final'
        ? {
            icon: <GraduationCap className="size-5" aria-hidden="true" />,
            title: 'Финальный экзамен',
            text: 'Все модули сданы. Осталось последнее испытание!',
            to: paths.finalExam(),
            action: 'К финалу',
          }
        : {
            icon: <PartyPopper className="size-5" aria-hidden="true" />,
            title: 'Курс пройден!',
            text: 'Ты прошёл весь курс. Продолжай практику в тренажёре и журнале сделок.',
            to: paths.certificate(),
            action: 'Мой сертификат',
          };

  return (
    <section aria-label="Продолжить обучение" className={box}>
      <Candles />
      <div className="flex flex-col gap-2 md:max-w-[calc(100%-15rem)]">
        <p className="flex items-center gap-2 text-xs font-medium tracking-[0.14em] text-text-muted uppercase">
          <span className="text-xp">{icon}</span>
          Следующий шаг
        </p>
        <h2 className="text-2xl leading-tight font-semibold tracking-tight md:text-[1.75rem]">
          {title}
        </h2>
        <p className="text-text-muted">{text}</p>
      </div>
      <Link to={to} className={cn(buttonClass(), 'self-start')}>
        {action}
      </Link>
      <CourseBar done={done} total={total} />
    </section>
  );
}
