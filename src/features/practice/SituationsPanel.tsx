import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SITUATIONS } from '@/content/practice/situations';
import {
  choiceById,
  disciplineScore,
  stepById,
  type ChoiceVerdict,
  type Situation,
} from '@/lib/practice/situations';

const VERDICT: Record<ChoiceVerdict, { label: string; className: string }> = {
  good: { label: 'По плану', className: 'bg-bull-soft text-bull' },
  risky: { label: 'Спорно', className: 'bg-warn-soft text-warn' },
  bad: { label: 'Нарушение', className: 'bg-bear-soft text-bear' },
};

interface Answer {
  stepId: string;
  choiceId: string;
}

function Story({ situation, onBack }: { situation: Situation; onBack: () => void }) {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const last = answers.at(-1);
  const lastStep = last ? stepById(situation, last.stepId) : undefined;
  const lastChoice = lastStep && last ? choiceById(lastStep, last.choiceId) : undefined;
  const currentId = last ? lastChoice?.next : situation.steps[0]?.id;
  const current = currentId ? stepById(situation, currentId) : undefined;
  const verdicts = answers.flatMap((a) => {
    const step = stepById(situation, a.stepId);
    const choice = step ? choiceById(step, a.choiceId) : undefined;
    return choice ? [choice.verdict] : [];
  });
  const score = disciplineScore(verdicts);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold">{situation.title}</h2>
        <p className="text-sm text-text-muted">{situation.skill}</p>
      </div>
      {answers.map((a) => {
        const step = stepById(situation, a.stepId);
        const choice = step ? choiceById(step, a.choiceId) : undefined;
        if (!step || !choice) return null;
        return (
          <Card key={a.stepId} className="flex flex-col gap-2">
            <p className="text-text-muted">{step.text}</p>
            <p className="font-semibold">Твой выбор: {choice.text}</p>
            <p className="flex flex-col gap-1">
              <span
                className={`w-fit rounded-full px-2 py-0.5 text-xs font-bold ${VERDICT[choice.verdict].className}`}
              >
                {VERDICT[choice.verdict].label}
              </span>
              <span className="text-sm">{choice.feedback}</span>
            </p>
          </Card>
        );
      })}
      {current ? (
        <Card className="flex flex-col gap-3">
          <p className="text-lg">{current.text}</p>
          <div className="flex flex-col gap-2">
            {current.choices.map((c) => (
              <Button
                key={c.id}
                variant="secondary"
                className="h-auto justify-start py-2 text-left whitespace-normal"
                onClick={() =>
                  setAnswers((prev) => [...prev, { stepId: current.id, choiceId: c.id }])
                }
              >
                {c.text}
              </Button>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="flex flex-col gap-3">
          <p className="font-semibold">
            Ситуация закончилась. Решений по плану: {Math.round((score ?? 0) * 100)} %.
          </p>
          <p className="text-sm text-text-muted">
            Оценивается не прибыль, а то, насколько решения следовали правилам: именно это
            переносится на реальный счёт.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setAnswers([])}>
              Пройти ещё раз
            </Button>
            <Button variant="ghost" onClick={onBack}>
              Другие ситуации
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

/** «Ситуации»: branching psychology stories judged by the trading plan (T-2504). */
export function SituationsPanel() {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = SITUATIONS.find((s) => s.id === openId);
  if (open) return <Story key={open.id} situation={open} onBack={() => setOpenId(null)} />;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {SITUATIONS.map((s) => (
        <Card key={s.id} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{s.title}</h2>
          <p className="flex-1 text-sm text-text-muted">{s.skill}</p>
          <Button variant="secondary" onClick={() => setOpenId(s.id)}>
            Начать
          </Button>
        </Card>
      ))}
    </div>
  );
}
