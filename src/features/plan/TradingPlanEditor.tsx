import { useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { PLAN_SECTIONS } from '@/content/tradingPlan';
import { useProgress } from '@/store/progressStore';
import { toast } from '@/store/uiStore';
import type { PlanSectionId, TradingPlan } from '@/types/progress';

type Sections = Record<PlanSectionId, string>;

const initialSections = (plan: TradingPlan | null): Sections =>
  Object.fromEntries(
    PLAN_SECTIONS.map((s) => [s.id, plan?.sections[s.id] ?? s.template]),
  ) as Sections;

const dateFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** Written trading plan (m10-l03): nine sections, prefilled with the course template. */
export function TradingPlanEditor() {
  const saved = useProgress((s) => s.tradingPlan);
  const dispatch = useProgress((s) => s.dispatch);
  const [sections, setSections] = useState<Sections>(() => initialSections(saved));
  const [dirty, setDirty] = useState(false);

  const save = () => {
    useProgress.setState({ tradingPlan: { sections, updatedAt: Date.now() } });
    dispatch({ type: 'planSaved' });
    setDirty(false);
    toast({ tone: 'success', title: 'Торговый план сохранён' });
  };

  return (
    <Card className="flex flex-col gap-4 print:border-0 print:p-0 print:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-extrabold">Мой торговый план</h2>
        <span className="text-sm text-text-muted">
          {saved
            ? `Сохранён ${dateFormat.format(saved.updatedAt)}${dirty ? ' · есть несохранённые правки' : ''}`
            : 'Это шаблон курса — отредактируй под себя и сохрани'}
        </span>
      </div>
      {PLAN_SECTIONS.map((section, i) => (
        <div key={section.id} className="break-inside-avoid">
          <Field label={`${i + 1}. ${section.title}`} hint={section.hint} className="print:hidden">
            {({ id, describedBy }) => (
              <textarea
                id={id}
                aria-describedby={describedBy}
                rows={3}
                value={sections[section.id]}
                onChange={(e) => {
                  setSections((prev) => ({ ...prev, [section.id]: e.target.value }));
                  setDirty(true);
                }}
                className="rounded-2xl border-2 border-border bg-surface p-3"
              />
            )}
          </Field>
          <div className="hidden print:block">
            <h3 className="font-extrabold">
              {i + 1}. {section.title}
            </h3>
            <p className="whitespace-pre-wrap">{sections[section.id]}</p>
          </div>
        </div>
      ))}
      <Button
        className="self-start print:hidden"
        leftIcon={<Save className="size-5" aria-hidden="true" />}
        disabled={saved !== null && !dirty}
        onClick={save}
      >
        Сохранить план
      </Button>
    </Card>
  );
}
