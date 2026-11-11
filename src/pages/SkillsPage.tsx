import { Link } from 'react-router';
import { PageHeader } from '@/app/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState, PageSkeleton } from '@/components/ui/Skeleton';
import { buttonClass } from '@/components/ui/styles';
import { Mascot } from '@/components/mascot/Mascot';
import { courseIndex } from '@/content/courseIndex';
import { skillGroups, skillIndex } from '@/content/skills';
import { useLearnerModel } from '@/features/learner/useLearnerModel';
import { useDueReviews } from '@/features/learner/useDueReviews';
import { BEHAVIOUR_RULES } from '@/lib/learner/behaviour';
import { DEFICIT_TEXT, knowledgeLevel, practiceLevel, summarize } from '@/lib/learner/describe';
import type { SkillState } from '@/lib/learner/gap';
import { formatPct, plural } from '@/lib/format';
import { usePageTitle } from '@/hooks/usePageTitle';
import { paths } from '@/app/paths';

const ruleOf = new Map(BEHAVIOUR_RULES.map((r) => [r.skill, r]));

function SkillRow({ state }: { state: SkillState }) {
  const skill = skillIndex.getSkill(state.skill);
  if (!skill) return null;
  const text = DEFICIT_TEXT[state.deficit];
  const k = state.knowledge;
  const b = state.behaviour;
  const rule = ruleOf.get(skill.id);
  const practice = practiceLevel(state);
  const lesson = courseIndex.getLesson(skill.lessons[0] ?? '');
  const knowledgeHint = k
    ? `Оценка знания ${formatPct(k.p, 0)}: ${k.correct} из ${k.answers} ответов верно`
    : undefined;
  return (
    <li className="flex flex-col gap-2 border-t border-border py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{skill.title}</h3>
        <Badge tone={text.tone}>{text.label}</Badge>
      </div>
      <div className="flex items-center gap-3" title={knowledgeHint}>
        <span className="w-36 shrink-0 text-sm text-text-muted">
          Знание: <span className="font-semibold text-text">{knowledgeLevel(state)}</span>
        </span>
        <ProgressBar
          size="sm"
          label={`Знание: ${skill.title}`}
          value={k && k.answers >= 3 ? k.p : 0}
          tone={state.deficit === 'knowledge' ? 'xp' : 'primary'}
          valueText={knowledgeLevel(state)}
        />
      </div>
      {practice && rule && (
        <p
          className="text-sm text-text-muted"
          title={b ? `Соблюдено в ${b.kept} из ${b.trades} сделок` : undefined}
        >
          Практика ({rule.title.toLowerCase()}):{' '}
          <span className="font-semibold text-text">{practice}</span>
          {b && (
            <>
              {' '}
              · {b.kept} из {b.trades} {plural(b.trades, ['сделки', 'сделок', 'сделок'])}
            </>
          )}
        </p>
      )}
      {state.deficit !== 'new' && state.deficit !== 'mastered' && (
        <p className="text-sm">{text.advice}</p>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold">
        {lesson && (
          <Link to={paths.lesson(lesson.id)} className="text-info hover:underline">
            Урок: {lesson.title}
          </Link>
        )}
        {(state.deficit === 'behaviour' || state.deficit === 'practice') && (
          <Link to={paths.simulator()} className="text-info hover:underline">
            В тренажёр
          </Link>
        )}
      </div>
    </li>
  );
}

/** /skills — what the learner knows, applies, and where the two part (learner model). */
export function SkillsPage() {
  usePageTitle('Мои навыки');
  const model = useLearnerModel();
  const due = useDueReviews();

  const header = (
    <PageHeader
      title="Мои навыки"
      subtitle="Что ты знаешь по тестам и что применяешь в сделках тренажёра"
    />
  );
  if (!model) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <PageSkeleton />
      </div>
    );
  }
  const summary = summarize(model.states);
  if (summary.started === 0) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <EmptyState
          art={<Mascot mood="thinking" size={120} />}
          title="Навыки появятся после первого теста"
          description="Каждый ответ в тестах уроков и экзаменов уточняет оценку навыков, а сделки в тренажёре показывают, как правила работают на практике."
          action={
            <Link to={paths.path()} className={buttonClass()}>
              К карте курса
            </Link>
          }
        />
      </div>
    );
  }
  const byId = new Map(model.states.map((s) => [s.skill, s]));
  return (
    <div className="flex flex-col gap-4">
      {header}
      <Card className="grid gap-4 sm:grid-cols-3" aria-label="Сводка">
        <div>
          <p className="text-sm text-text-muted">Освоено</p>
          <p className="font-mono text-2xl font-semibold">
            {summary.mastered} <span className="text-base text-text-muted">из {summary.total}</span>
          </p>
        </div>
        <div>
          <p className="text-sm text-text-muted">Знаю, но нарушаю</p>
          <p className="font-mono text-2xl font-semibold">{summary.gaps}</p>
        </div>
        <div>
          <p className="text-sm text-text-muted">Повторить сегодня</p>
          <p className="font-mono text-2xl font-semibold">
            {due.length > 0 ? (
              <Link to={paths.review()} className="text-info hover:underline">
                {due.length}
              </Link>
            ) : (
              0
            )}
          </p>
        </div>
      </Card>
      {model.tradesMissing && (
        <Card role="status">
          Сделки тренажёра не прочитались (браузер без IndexedDB), поэтому практика не оценена.
        </Card>
      )}
      {skillGroups.map((group) => {
        const states = skillIndex.skills
          .filter((s) => s.group === group.id)
          .map((s) => byId.get(s.id))
          .filter((s): s is SkillState => s !== undefined);
        if (states.length === 0) return null;
        return (
          <Card key={group.id} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{group.title}</h2>
            <ul className="flex flex-col">
              {states.map((s) => (
                <SkillRow key={s.skill} state={s} />
              ))}
            </ul>
          </Card>
        );
      })}
      <p className="text-sm text-text-muted">
        Оценки — подсказка для учёбы, а не экзамен: знание считается по ответам в тестах с учётом
        забывания, практика — по правилам риска в сделках тренажёра. Реальную торговлю сайт не
        оценивает.
      </p>
    </div>
  );
}
