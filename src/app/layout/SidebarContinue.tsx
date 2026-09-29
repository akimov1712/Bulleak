import { Link, useLocation } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { Mascot } from '@/components/mascot/Mascot';
import { courseIndex } from '@/content/courseIndex';
import { useUnlockContext } from '@/hooks/useUnlock';
import { nextStep, type NextStep } from '@/lib/progress/nextStep';
import { courseCompletion } from '@/lib/progress/unlock';
import { paths } from '../paths';

function target(step: NextStep): { eyebrow: string; title: string; to: string } {
  switch (step.kind) {
    case 'lesson': {
      const module = courseIndex.getModule(step.lesson.moduleId);
      return {
        eyebrow: `Продолжить · модуль ${module?.index ?? ''}`,
        title: step.lesson.title,
        to:
          step.status === 'read' ? paths.lessonQuiz(step.lesson.id) : paths.lesson(step.lesson.id),
      };
    }
    case 'exam':
      return {
        eyebrow: 'Следующий шаг',
        title: `Экзамен модуля ${step.module.index}`,
        to: paths.exam(step.module.id),
      };
    case 'final':
      return { eyebrow: 'Следующий шаг', title: 'Финальный экзамен', to: paths.finalExam() };
    case 'done':
      return { eyebrow: 'Курс пройден', title: 'Твой сертификат', to: paths.certificate() };
  }
}

/** Compact «what's next» card with course progress; hidden on home, which has the big card. */
export function SidebarContinue() {
  const ctx = useUnlockContext();
  const { pathname } = useLocation();
  if (pathname === paths.home()) return null;
  const { eyebrow, title, to } = target(nextStep(ctx));
  const { done, total } = courseCompletion(ctx);
  return (
    <Link
      to={to}
      className="group relative mx-3 mb-6 flex shrink-0 flex-col gap-1 overflow-hidden rounded-2xl bg-primary p-3.5 text-on-primary shadow-[0_3px_0_0_var(--primary-shade)] transition-transform active:translate-y-0.5 active:shadow-none"
    >
      <span className="flex items-center justify-between gap-2 text-[0.68rem] font-black tracking-[0.12em] uppercase">
        <span>{eyebrow}</span>
        <ArrowRight
          className="size-4 shrink-0 opacity-70 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </span>
      <span className="line-clamp-2 leading-snug font-extrabold">{title}</span>
      <span className="mt-2 flex items-center gap-2 pr-11 text-xs font-extrabold">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-on-primary/15">
          <span
            className="block h-full rounded-full bg-on-primary/70"
            style={{ width: `${(done / total) * 100}%` }}
          />
        </span>
        <span className="font-mono tabular-nums">
          {done}/{total}
        </span>
      </span>
      <span className="absolute -right-1.5 -bottom-2.5" aria-hidden="true">
        <Mascot mood="happy" size={50} />
      </span>
    </Link>
  );
}
