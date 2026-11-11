import { Link } from 'react-router';
import { Compass } from 'lucide-react';
import { cn } from '@/lib/cn';
import { buttonClass, cardClass } from '@/components/ui/styles';
import { courseIndex } from '@/content/courseIndex';
import { skillIndex } from '@/content/skills';
import { BEHAVIOUR_RULES } from '@/lib/learner/behaviour';
import { recommendStep } from '@/lib/learner/recommend';
import { paths } from '@/app/paths';
import { useLearnerModel } from './useLearnerModel';
import { useDueReviews } from './useDueReviews';

const titleOf = (id: string) => skillIndex.getSkill(id)?.title ?? id;
const lessonOf = (id: string) => courseIndex.getLesson(skillIndex.getSkill(id)?.lessons[0] ?? '');
const ruleOf = (id: string) => BEHAVIOUR_RULES.find((r) => r.skill === id);

interface Advice {
  text: string;
  action: { to: string; label: string };
}

/**
 * «Совет на сегодня» on the home page: the learner model's next step. Hidden when the model has
 * nothing better than the course itself (the «Продолжить» card covers that).
 */
export function AdviceCard({ className }: { className?: string }) {
  const model = useLearnerModel();
  const due = useDueReviews();
  if (!model) return null;
  const ordered = skillIndex.order
    .map((id) => model.states.find((s) => s.skill === id))
    .filter((s) => s !== undefined);
  const step = recommendStep(
    ordered,
    due.map((d) => d.skill),
    (id) => skillIndex.getSkill(id)?.requires ?? [],
    model.misconceptions,
  );

  let advice: Advice | null = null;
  switch (step.kind) {
    case 'gap': {
      const rule = ruleOf(step.skill);
      advice = {
        text: `В тестах навык «${titleOf(step.skill)}» в порядке, а в сделках тренажёра правило${rule ? ` «${rule.title.toLowerCase()}»` : ''} часто нарушается. Разбери свои сделки и сыграй новую по правилам.`,
        action: { to: paths.skills(), label: 'Посмотреть навык' },
      };
      break;
    }
    // Review: the «Сегодня повторить» card already offers it; course: the «Продолжить» card.
    case 'review':
    case 'course':
      advice = null;
      break;
    case 'theory': {
      const lesson = lessonOf(step.skill);
      advice = {
        text: step.misconception
          ? `В навыке «${titleOf(step.skill)}» был уверенный, но неверный ответ — похоже на заблуждение. Перечитай урок и разбор ошибки.`
          : `Навык «${titleOf(step.skill)}» пока даётся тяжело. Стоит перечитать урок и пересдать тест.`,
        action: lesson
          ? { to: paths.lesson(lesson.id), label: 'Открыть урок' }
          : { to: paths.skills(), label: 'Мои навыки' },
      };
      break;
    }
    case 'practice':
      advice = {
        text: `Теория по навыку «${titleOf(step.skill)}» освоена — проверь её на сделках в тренажёре.`,
        action: { to: paths.simulator(), label: 'В тренажёр' },
      };
      break;
  }
  if (!advice) return null;
  return (
    <section
      aria-labelledby="advice-card-title"
      className={cn(cardClass({ padding: 'md' }), 'flex flex-col gap-3', className)}
    >
      <h2 id="advice-card-title" className="flex items-center gap-2 font-semibold">
        <Compass className="size-5 text-primary" aria-hidden="true" />
        Совет на сегодня
      </h2>
      <p>{advice.text}</p>
      <Link
        to={advice.action.to}
        className={cn(buttonClass({ variant: 'secondary' }), 'self-start')}
      >
        {advice.action.label}
      </Link>
    </section>
  );
}
