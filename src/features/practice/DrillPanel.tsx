import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { NumberInput } from '@/components/ui/NumberInput';
import { Segmented } from '@/components/ui/Segmented';
import {
  checkDrill,
  DRILL_KINDS,
  DRILL_LABEL,
  generateDrill,
  type Drill,
  type DrillKind,
} from '@/lib/practice/drills';
import { mulberry32 } from '@/lib/random';
import { usePractice } from '@/store/practiceStore';

const fmt = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 2 });

/** «Навыки»: endless tasks on one skill with an instant check and the worked solution. */
export function DrillPanel({ seed }: { seed: number }) {
  const [rng] = useState(() => mulberry32(seed));
  const [kind, setKind] = useState<DrillKind>('size');
  const [drill, setDrill] = useState<Drill>(() => generateDrill('size', rng));
  const [value, setValue] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<boolean | null>(null);
  const stats = usePractice((s) => s.drills[kind]);
  const record = usePractice((s) => s.recordDrill);

  const next = (k: DrillKind = kind) => {
    setDrill(generateDrill(k, rng));
    setValue(null);
    setVerdict(null);
  };

  const submit = () => {
    if (verdict !== null) {
      next();
      return;
    }
    if (value === null) return;
    const ok = checkDrill(drill, value);
    setVerdict(ok);
    record(kind, ok);
  };

  return (
    <div className="flex flex-col gap-4">
      <Segmented<DrillKind>
        label="Навык"
        value={kind}
        options={DRILL_KINDS.map((k) => ({ value: k, label: DRILL_LABEL[k] }))}
        onChange={(k) => {
          setKind(k);
          next(k);
        }}
      />
      <Card className="flex flex-col gap-4">
        <p className="text-lg">{drill.prompt}</p>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Field label="Ответ">
            {({ id, describedBy }) => (
              <NumberInput
                id={id}
                aria-describedby={describedBy}
                value={value}
                onValueChange={setValue}
                unit={drill.unit}
                disabled={verdict !== null}
                className="w-48"
              />
            )}
          </Field>
          <Button type="submit" disabled={verdict === null && value === null}>
            {verdict === null ? 'Проверить' : 'Следующая задача'}
          </Button>
        </form>
        {verdict !== null && (
          <div
            role="status"
            className={`flex flex-col gap-1 rounded-xl p-3 ${verdict ? 'bg-bull-soft' : 'bg-bear-soft'}`}
          >
            <p
              className={`flex items-center gap-2 font-bold ${verdict ? 'text-bull' : 'text-bear'}`}
            >
              {verdict ? (
                <CheckCircle2 className="size-5" aria-hidden="true" />
              ) : (
                <XCircle className="size-5" aria-hidden="true" />
              )}
              {verdict ? 'Верно' : `Правильно: ${fmt(drill.answer)} ${drill.unit}`}
            </p>
            <p className="text-sm">{drill.explanation}</p>
          </div>
        )}
      </Card>
      <p className="text-sm text-text-muted">
        {DRILL_LABEL[kind]}: решено {stats.correct} из {stats.done}, серия {stats.streak}, лучшая
        серия {stats.best}.
      </p>
    </div>
  );
}
