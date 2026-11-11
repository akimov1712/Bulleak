import { useMemo } from 'react';
import { Link } from 'react-router';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/Skeleton';
import { Mascot } from '@/components/mascot/Mascot';
import { courseIndex } from '@/content/courseIndex';
import { skillIndex } from '@/content/skills';
import { answerEvents } from '@/lib/learner/events';
import {
  answerTiming,
  confusedSkills,
  frequentMistakes,
  lessonOfQuestion,
  RUSHED_SEC,
} from '@/lib/stats/quizAnalytics';
import { formatNumber, plural } from '@/lib/format';
import { useProgress } from '@/store/progressStore';
import { paths } from '@/app/paths';
import type { QuestionType } from '@/types/quiz';

const TYPE_LABEL: Record<QuestionType, string> = {
  single: 'Один ответ',
  multi: 'Несколько ответов',
  truefalse: 'Верно / неверно',
  numeric: 'Число',
  'chart-click': 'Клик по графику',
  match: 'Сопоставление',
  order: 'Порядок',
};

const skillTitle = (id: string) => skillIndex.getSkill(id)?.title ?? id;

/** Where a question lives: «Тест урока …, вопрос N» or «Экзамен модуля …». */
function questionPlace(questionId: string): { text: string; to: string } {
  const lessonId = lessonOfQuestion(questionId);
  if (lessonId) {
    const lesson = courseIndex.getLesson(lessonId);
    const n = questionId.split('-q')[1];
    return { text: `${lesson?.title ?? lessonId}, вопрос ${n}`, to: paths.lesson(lessonId) };
  }
  const moduleId = questionId.split('-')[0] ?? '';
  const module = courseIndex.getModule(moduleId);
  return { text: `Экзамен: ${module?.title ?? moduleId}`, to: paths.module(moduleId) };
}

/** «Тесты» tab: repeated mistakes, skills mixed up together, time per question. */
export function QuizStats() {
  const attempts = useProgress((s) => s.quizAttempts);
  const events = useMemo(
    () => answerEvents(attempts, skillIndex.skillsOfTags).filter((e) => e.questionId),
    [attempts],
  );
  if (events.length === 0) {
    return (
      <EmptyState
        art={<Mascot mood="thinking" size={120} />}
        title="Ответов пока нет"
        description="Аналитика появится после первых тестов: частые ошибки, темы, которые путаются, и время на вопрос."
        action={
          <Link to={paths.path()} className="font-bold text-info underline">
            К карте курса
          </Link>
        }
      />
    );
  }
  const mistakes = frequentMistakes(events).slice(0, 10);
  const pairs = confusedSkills(events).slice(0, 5);
  const timing = answerTiming(events);
  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-2" aria-label="Частые ошибки">
        <h2 className="font-semibold">Частые ошибки</h2>
        {mistakes.length === 0 ? (
          <p className="text-text-muted">Вопросов с повторными ошибками нет.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {mistakes.map((m) => {
              const place = questionPlace(m.questionId);
              return (
                <li
                  key={m.questionId}
                  className="flex flex-wrap items-baseline justify-between gap-2"
                >
                  <Link to={place.to} className="font-semibold text-info hover:underline">
                    {place.text}
                  </Link>
                  <span className="text-sm text-text-muted">
                    ошибок {m.wrong} из {m.answers}
                    {m.fixed ? ' · в последний раз верно' : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <Card className="flex flex-col gap-2" aria-label="Темы, которые путаются">
        <h2 className="font-semibold">Темы, которые путаются</h2>
        {pairs.length === 0 ? (
          <p className="text-text-muted">Пар тем с ошибками в одних и тех же тестах нет.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {pairs.map((p) => (
              <li key={`${p.a}|${p.b}`}>
                {skillTitle(p.a)} и {skillTitle(p.b)} — ошибки вместе в {p.together}{' '}
                {plural(p.together, ['тесте', 'тестах', 'тестах'])}
              </li>
            ))}
          </ul>
        )}
      </Card>
      {timing.timed > 0 && (
        <Card className="flex flex-col gap-2" aria-label="Время на вопрос">
          <h2 className="font-semibold">Время на вопрос</h2>
          <ul className="flex flex-col gap-1">
            {timing.byType.map((t) => (
              <li key={t.type} className="flex justify-between gap-3">
                <span>{TYPE_LABEL[t.type]}</span>
                <span className="font-mono tabular-nums">
                  {formatNumber(t.medianSec, 0)} с · {t.answers}{' '}
                  {plural(t.answers, ['ответ', 'ответа', 'ответов'])}
                </span>
              </li>
            ))}
          </ul>
          {timing.rushedWrong > 0 && (
            <p className="text-sm text-warn">
              Ошибок быстрее {RUSHED_SEC} секунд: {timing.rushedWrong}. Похоже на ответ наугад —
              стоит дочитывать вопрос.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
