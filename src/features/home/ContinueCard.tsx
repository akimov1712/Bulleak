import { Link } from 'react-router';
import { GraduationCap, PartyPopper, Trophy } from 'lucide-react';
import { cn } from '@/lib/cn';
import { courseIndex } from '@/content/courseIndex';
import { moduleColors } from '@/components/ui/moduleColors';
import { ModuleIcon } from '@/components/ui/ModuleIcon';
import { buttonClass } from '@/components/ui/styles';
import { paths } from '@/app/paths';
import type { NextStep } from '@/lib/progress/nextStep';

/** Big "what's next" card on the home page. */
export function ContinueCard({ step }: { step: NextStep }) {
  if (step.kind === 'lesson') {
    const module = courseIndex.getModule(step.lesson.moduleId);
    const color = module ? moduleColors[module.color] : moduleColors.green;
    const fresh = step.lesson.id === 'm00-l01' && step.status === 'available';
    return (
      <section
        aria-label="Продолжить обучение"
        className={cn(
          'flex flex-col gap-4 rounded-(--radius-card) p-5 text-on-mod md:p-6',
          color.bg,
          color.shadow,
        )}
      >
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/30">
            <ModuleIcon name={module?.icon ?? ''} className="size-7" />
          </span>
          <p className="text-sm font-extrabold tracking-wide uppercase">
            {fresh ? 'Начни отсюда' : 'Продолжить'} · Модуль {module?.index}. {module?.title}
          </p>
        </div>
        <div>
          <p className="text-2xl leading-tight font-extrabold md:text-3xl">{step.lesson.title}</p>
          <p className="mt-1 font-semibold opacity-90">
            {step.status === 'read'
              ? 'Урок прочитан — остался тест'
              : `~${step.lesson.minutes} минут`}
          </p>
        </div>
        <Link
          to={
            step.status === 'read' ? paths.lessonQuiz(step.lesson.id) : paths.lesson(step.lesson.id)
          }
          className="self-start rounded-(--radius-btn) bg-surface px-6 py-3 text-lg font-extrabold text-text shadow-[0_4px_0_0_rgb(0_0_0/0.2)] transition-transform active:translate-y-1 active:shadow-none"
        >
          {step.status === 'read'
            ? 'Пройти тест'
            : fresh
              ? 'Начать первый урок'
              : 'Продолжить урок'}
        </Link>
      </section>
    );
  }

  const { icon, title, text, to, action } =
    step.kind === 'exam'
      ? {
          icon: <Trophy className="size-8" aria-hidden="true" />,
          title: `Экзамен модуля ${step.module.index}`,
          text: `Все уроки «${step.module.title}» пройдены — сдай экзамен, чтобы открыть следующий модуль.`,
          to: paths.exam(step.module.id),
          action: 'Сдать экзамен',
        }
      : step.kind === 'final'
        ? {
            icon: <GraduationCap className="size-8" aria-hidden="true" />,
            title: 'Финальный экзамен',
            text: 'Все модули сданы. Осталось последнее испытание!',
            to: paths.finalExam(),
            action: 'К финалу',
          }
        : {
            icon: <PartyPopper className="size-8" aria-hidden="true" />,
            title: 'Курс пройден!',
            text: 'Ты прошёл весь курс. Продолжай практику в тренажёре и журнале сделок.',
            to: paths.certificate(),
            action: 'Мой сертификат',
          };

  return (
    <section
      aria-label="Продолжить обучение"
      className="flex flex-col gap-4 rounded-(--radius-card) border-2 border-xp-shade bg-surface p-5 shadow-[0_4px_0_0_var(--xp-shade)] md:p-6"
    >
      <div className="flex items-center gap-3 text-xp-shade">
        {icon}
        <p className="text-2xl font-extrabold text-text">{title}</p>
      </div>
      <p className="text-text-muted">{text}</p>
      <Link to={to} className={cn(buttonClass({ variant: 'xp', size: 'lg' }), 'self-start')}>
        {action}
      </Link>
    </section>
  );
}
