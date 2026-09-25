import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Pill } from '@/components/ui/Badge';
import { MascotSay } from '@/components/mascot/MascotSay';
import { useProgress } from '@/store/progressStore';
import { useSettings } from '@/store/settingsStore';
import type { DailyGoalXp } from '@/types/settings';

const GOALS: { xp: DailyGoalXp; label: string; hint: string }[] = [
  { xp: 20, label: 'Спокойно', hint: '~10 мин в день' },
  { xp: 50, label: 'Обычно', hint: '~20 мин в день' },
  { xp: 100, label: 'Серьёзно', hint: '~40 мин в день' },
  { xp: 150, label: 'Интенсив', hint: '~1 час в день' },
];

/** First-visit setup: name and daily goal. Shown until a name is saved. */
export function Onboarding() {
  const setName = useProgress((s) => s.setName);
  const goal = useSettings((s) => s.dailyGoalXp);
  const update = useSettings((s) => s.update);
  const [name, setNameInput] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    setName(name.trim() || 'Трейдер');
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <MascotSay mood="happy" layout="stack" size={130}>
        Привет! Я Буллик. Помогу тебе пройти путь от первой свечи до своей стратегии. Давай
        познакомимся?
      </MascotSay>
      <Card padding="lg">
        <form onSubmit={submit} className="flex flex-col gap-5">
          <h1 className="text-2xl font-extrabold">Добро пожаловать в курс!</h1>
          <Field label="Как тебя зовут?" hint="Имя будет в приветствии и на сертификате.">
            {({ id, describedBy }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                value={name}
                maxLength={40}
                placeholder="Например, Артём"
                onChange={(e) => setNameInput(e.target.value)}
              />
            )}
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-bold">Цель на день</legend>
            <div className="grid grid-cols-2 gap-2">
              {GOALS.map((g) => (
                <Pill
                  key={g.xp}
                  selected={goal === g.xp}
                  onClick={() => update({ dailyGoalXp: g.xp })}
                  className="flex h-auto min-h-14 flex-col items-start rounded-2xl px-3 py-2 text-left"
                >
                  <span className="font-extrabold">
                    {g.label} · {g.xp} XP
                  </span>
                  <span className="text-xs font-semibold opacity-80">{g.hint}</span>
                </Pill>
              ))}
            </div>
          </fieldset>
          <Button type="submit" size="lg" fullWidth>
            Поехали!
          </Button>
        </form>
      </Card>
    </div>
  );
}
