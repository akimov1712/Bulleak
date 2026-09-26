import { Link } from 'react-router';
import { BookOpen, CheckCircle2, Target, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { buttonClass } from '@/components/ui/styles';
import { paths } from '@/app/paths';
import { courseIndex } from '@/content/courseIndex';
import { isDecisionCorrect } from '@/content/scenarios';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import type { SimDecision, SimScenario } from '@/types/trading';

const DECISION_LABEL: Record<SimDecision, string> = {
  long: 'лонг',
  short: 'шорт',
  skip: 'пропустить',
};

/** Scenario task shown above the chart before the decision. */
export function ScenarioBrief({ scenario }: { scenario: SimScenario }) {
  const lesson = courseIndex.getLesson(scenario.lessonId);
  return (
    <Card className="flex flex-col gap-2 border-info/60" aria-label="Задание сценария">
      <p className="flex items-center gap-2 text-sm font-extrabold text-info">
        <Target className="size-5" aria-hidden="true" />
        Сценарий: {scenario.title}
      </p>
      <p>{scenario.task}</p>
      {lesson && (
        <p className="text-sm text-text-muted">
          По уроку{' '}
          <Link to={paths.lesson(lesson.id)} className="font-bold text-info hover:underline">
            «{lesson.title}»
          </Link>
        </p>
      )}
    </Card>
  );
}

/** Textbook reading after the decision, compared with the learner's choice. */
export function ScenarioDebrief({
  scenario,
  decision,
}: {
  scenario: SimScenario;
  decision: SimDecision;
}) {
  const correct = isDecisionCorrect(scenario, decision);
  const Icon = correct ? CheckCircle2 : XCircle;
  return (
    <Card className="flex flex-col gap-3" aria-label="Разбор сценария">
      <p
        role="status"
        className={cn(
          'flex items-center gap-2 text-lg font-extrabold',
          correct ? 'text-bull' : 'text-bear',
        )}
      >
        <Icon className="size-6 shrink-0" aria-hidden="true" />
        {correct
          ? 'Решение совпало с учебным'
          : `Твой выбор — ${DECISION_LABEL[decision]}, по учебнику — ${DECISION_LABEL[scenario.expected]}`}
      </p>
      <p>{scenario.debrief}</p>
      {scenario.ideal && (
        <p className="text-sm text-text-muted">
          Учебные уровни (пунктир на графике): стоп {formatNumber(scenario.ideal.sl, 0)}, тейк{' '}
          {formatNumber(scenario.ideal.tp, 0)}.
        </p>
      )}
      <p className="text-sm text-text-muted">
        Результат одной сделки — не оценка решения: даже учебный вход иногда выбивает по стопу.
      </p>
      <Link
        to={paths.lesson(scenario.lessonId)}
        className={buttonClass({ variant: 'secondary', fullWidth: true })}
      >
        <BookOpen className="size-5" aria-hidden="true" />
        Вернуться к уроку
      </Link>
    </Card>
  );
}
