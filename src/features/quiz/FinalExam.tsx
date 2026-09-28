import { use, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  CandlestickChart,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Target,
  Trophy,
  XCircle,
} from 'lucide-react';
import { paths } from '@/app/paths';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { buttonClass } from '@/components/ui/styles';
import { MascotSay } from '@/components/mascot/MascotSay';
import { useNow } from '@/hooks/useNow';
import { formatNumber, formatPct } from '@/lib/format';
import { examRetakeWaitMs } from '@/lib/quiz/exam';
import {
  gradePractical,
  practicalPassed,
  PRACTICAL_LIMITS,
  type PracticalGrade,
} from '@/lib/quiz/practical';
import { prepareQuiz, type PreparedQuiz } from '@/lib/quiz/prepare';
import { useProgress } from '@/store/progressStore';
import type { QuizResult } from '@/types/quiz';
import { PracticalTask } from './PracticalTask';
import { finalExamPromise } from './quizContent';
import { QuizResultView } from './QuizResultView';
import { QuizRunner, type QuizFinish } from './QuizRunner';

const DECISION_LABEL = { long: 'лонг', short: 'шорт', skip: 'пропуск' } as const;

type Phase =
  | { kind: 'intro' }
  | { kind: 'theory'; prepared: PreparedQuiz }
  | { kind: 'practical'; prepared: PreparedQuiz; theory: QuizFinish; grades: PracticalGrade[] }
  | {
      kind: 'result';
      prepared: PreparedQuiz;
      result: QuizResult;
      theoryPassed: boolean;
      grades: PracticalGrade[];
    };

/**
 * Final exam (/exam/final): a 40-question theory part from all module exams (85 %) and three
 * practical scenarios graded on the decision, risk ≤ 1 % and R:R ≥ 1.5. Both parts must pass.
 */
export function FinalExam() {
  const { finalExam, PRACTICAL_SCENARIOS: scenarios } = use(finalExamPromise());
  const navigate = useNavigate();
  const progress = useProgress((s) => s.exams.final);
  const recordExam = useProgress((s) => s.recordExam);
  const now = useNow();
  const [phase, setPhase] = useState<Phase>({ kind: 'intro' });
  const waitMs = examRetakeWaitMs(progress, now);

  if (phase.kind === 'theory') {
    return (
      <QuizRunner
        prepared={phase.prepared}
        mode="exam"
        title="Финальный экзамен · теория"
        onExit={() => navigate(paths.path())}
        onFinish={(theory) => {
          setPhase({ kind: 'practical', prepared: phase.prepared, theory, grades: [] });
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }

  if (phase.kind === 'practical') {
    const index = phase.grades.length;
    const scenario = scenarios[index];
    if (!scenario) return null;
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <PracticalTask
          scenario={scenario}
          index={index}
          total={scenarios.length}
          onSubmit={(answer) => {
            const grades = [...phase.grades, gradePractical(scenario.expected, answer)];
            window.scrollTo({ top: 0 });
            if (grades.length < scenarios.length) {
              setPhase({ ...phase, grades });
              return;
            }
            const theoryPassed = phase.theory.result.passed;
            const result = {
              ...phase.theory.result,
              passed: theoryPassed && practicalPassed(grades),
            };
            recordExam('final', result, phase.theory.durationSec);
            setPhase({ kind: 'result', prepared: phase.prepared, result, theoryPassed, grades });
          }}
        />
      </div>
    );
  }

  if (phase.kind === 'result') {
    const practicalOk = practicalPassed(phase.grades);
    return (
      <QuizResultView
        kind="exam"
        result={phase.result}
        questions={phase.prepared.questions}
        passRatio={finalExam.passRatio}
        failVerdict={
          phase.theoryPassed
            ? 'Теория сдана, но практическая часть — нет. Разбор задач ниже.'
            : `Для сдачи теории нужно ${formatPct(finalExam.passRatio, 0)}. Слабые темы — на странице статистики.`
        }
        note={
          <section className="flex w-full flex-col gap-3 text-left" aria-label="Итоги частей">
            <p className="font-bold">
              Теория: {formatPct(phase.result.ratio, 0)} —{' '}
              {phase.theoryPassed ? 'сдана' : `нужно ${formatPct(finalExam.passRatio, 0)}`}.
              Практика: {practicalOk ? 'сдана' : 'не сдана'}.
            </p>
            {scenarios.map((s, i) => {
              const g = phase.grades[i];
              if (!g) return null;
              return (
                <Card key={s.id} padding="sm" className="flex flex-col gap-1">
                  <p className="flex items-center gap-2 font-extrabold">
                    {g.passed ? (
                      <CheckCircle2 className="size-5 text-bull" aria-label="верно" />
                    ) : (
                      <XCircle className="size-5 text-bear" aria-label="ошибка" />
                    )}
                    {s.title}
                  </p>
                  {!g.decisionOk && (
                    <p className="text-sm text-bear">
                      Решение не совпало с учебным ({DECISION_LABEL[s.expected]}).
                    </p>
                  )}
                  {g.decisionOk && !g.passed && (
                    <p className="text-sm text-bear">
                      {!g.stopOk || !g.takeOk ? 'Стоп или тейк не с той стороны от входа. ' : ''}
                      {!g.riskOk ? `Риск больше ${PRACTICAL_LIMITS.maxRiskPct} %. ` : ''}
                      {!g.rrOk && g.rr !== null
                        ? `R:R 1 : ${formatNumber(g.rr, 2)} — меньше 1 : ${formatNumber(PRACTICAL_LIMITS.minRR, 1)}.`
                        : ''}
                    </p>
                  )}
                  <p className="text-sm text-text-muted">{s.debrief}</p>
                </Card>
              );
            })}
          </section>
        }
        actions={
          phase.result.passed ? (
            <Link to={paths.certificate()} className={buttonClass({ size: 'lg' })}>
              Получить сертификат
            </Link>
          ) : (
            <>
              {waitMs > 0 && (
                <p className="text-sm text-text-muted">
                  Пересдать можно через 10 минут — повтори слабые темы на странице статистики.
                </p>
              )}
              <Link
                to={paths.stats()}
                className={buttonClass({ variant: 'secondary', size: 'lg' })}
              >
                Слабые темы
              </Link>
            </>
          )
        }
      />
    );
  }

  const passed = progress?.passedAt !== undefined;
  const waitMin = Math.max(1, Math.round(waitMs / 60_000));
  const sample = finalExam.sample ?? finalExam.questions.length;
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <MascotSay mood="pointing" layout="stack">
        Финальный экзамен: вопросы по всему курсу и три решения на реальных графиках. Удачи!
      </MascotSay>
      <Card className="flex flex-col gap-4">
        <h1 className="text-2xl font-extrabold">Финальный экзамен</h1>
        <ul className="flex flex-col gap-3">
          <li className="flex items-center gap-3">
            <ClipboardCheck className="size-6 shrink-0 text-info" aria-hidden="true" />
            Теория: {sample} вопросов по всем модулям, нужно {formatPct(finalExam.passRatio, 0)}
          </li>
          <li className="flex items-center gap-3">
            <CandlestickChart className="size-6 shrink-0 text-epic" aria-hidden="true" />
            Практика: {scenarios.length} ситуации на истории Bybit — решение, стоп, тейк и риск
          </li>
          <li className="flex items-center gap-3">
            <Target className="size-6 shrink-0 text-primary-shade" aria-hidden="true" />
            Оценивается решение: риск не больше {PRACTICAL_LIMITS.maxRiskPct} % и R:R не меньше 1 :{' '}
            {formatNumber(PRACTICAL_LIMITS.minRR, 1)}, а не результат сделки
          </li>
          {progress && progress.attempts > 0 && (
            <li className="flex items-center gap-3">
              <Trophy className="size-6 shrink-0 text-xp-shade" aria-hidden="true" />
              {passed ? 'Экзамен сдан. ' : ''}Лучший результат теории: {formatPct(progress.best, 0)}
            </li>
          )}
        </ul>
        {waitMs > 0 ? (
          <p
            className="flex items-center gap-3 rounded-2xl bg-warn-soft p-3 font-bold"
            role="status"
          >
            <Clock className="size-6 shrink-0 text-warn" aria-hidden="true" />
            Пересдача откроется через {waitMin} мин. Самое время повторить слабые темы.
          </p>
        ) : (
          <Button
            size="lg"
            fullWidth
            onClick={() =>
              setPhase({ kind: 'theory', prepared: prepareQuiz(finalExam, Date.now()) })
            }
          >
            {passed ? 'Пройти ещё раз' : 'Начать экзамен'}
          </Button>
        )}
      </Card>
    </div>
  );
}
