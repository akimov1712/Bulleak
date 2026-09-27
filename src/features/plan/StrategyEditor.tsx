import { useState } from 'react';
import { Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { TPS } from '@/content/strategies';
import { cleanRules } from '@/lib/plan/plan';
import { useProgress } from '@/store/progressStore';
import { toast } from '@/store/uiStore';

/**
 * The learner's version of the course strategy (m11-l02). Starts from the TPS rules; the saved
 * rules become the backtest checklist in the simulator.
 */
export function StrategyEditor() {
  const saved = useProgress((s) => s.strategy);
  const [name, setName] = useState(saved?.name ?? TPS.title);
  const [rules, setRules] = useState<string[]>(() => [...(saved?.rules ?? TPS.rules)]);
  const [dirty, setDirty] = useState(false);
  const edit = (next: string[]) => {
    setRules(next);
    setDirty(true);
  };

  const save = () => {
    const clean = cleanRules(rules);
    if (clean.length === 0) {
      toast({ tone: 'error', title: 'Нужно хотя бы одно правило' });
      return;
    }
    useProgress.setState({
      strategy: { name: name.trim() || TPS.title, rules: clean, updatedAt: Date.now() },
    });
    setRules(clean);
    setDirty(false);
    toast({
      tone: 'success',
      title: 'Стратегия сохранена',
      description: 'Её правила — теперь чек-лист бэктеста в тренажёре.',
    });
  };

  return (
    <Card className="flex flex-col gap-4 break-inside-avoid print:border-0 print:p-0 print:shadow-none">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-extrabold">Моя стратегия</h2>
        <p className="text-sm text-text-muted print:hidden">
          Начни с правил TPS и поменяй то, что проверил на бэктесте. Эти правила станут чек-листом в
          режиме бэктеста тренажёра.
        </p>
      </div>
      <Field label="Название" className="print:hidden">
        {({ id }) => (
          <Input
            id={id}
            value={name}
            maxLength={80}
            onChange={(e) => {
              setName(e.target.value);
              setDirty(true);
            }}
          />
        )}
      </Field>
      <h3 className="hidden font-extrabold print:block">{name}</h3>
      <ol className="flex flex-col gap-2">
        {rules.map((rule, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-2.5 w-6 shrink-0 text-right font-bold text-text-muted">
              {i + 1}.
            </span>
            <Input
              aria-label={`Правило ${i + 1}`}
              value={rule}
              className="print:hidden"
              onChange={(e) => edit(rules.map((r, k) => (k === i ? e.target.value : r)))}
            />
            <span className="hidden pt-1 print:inline">{rule}</span>
            <IconButton
              label={`Удалить правило ${i + 1}`}
              icon={<Trash2 className="size-5" aria-hidden="true" />}
              className="print:hidden"
              onClick={() => edit(rules.filter((_, k) => k !== i))}
            />
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button
          variant="secondary"
          leftIcon={<Plus className="size-5" aria-hidden="true" />}
          onClick={() => edit([...rules, ''])}
        >
          Добавить правило
        </Button>
        <Button
          variant="ghost"
          leftIcon={<RotateCcw className="size-5" aria-hidden="true" />}
          onClick={() => {
            setName(TPS.title);
            edit([...TPS.rules]);
          }}
        >
          Вернуть правила TPS
        </Button>
        <Button
          leftIcon={<Save className="size-5" aria-hidden="true" />}
          disabled={!dirty}
          onClick={save}
        >
          Сохранить стратегию
        </Button>
      </div>
    </Card>
  );
}
