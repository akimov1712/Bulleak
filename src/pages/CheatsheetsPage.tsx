import { useState } from 'react';
import { CheckCircle2, ListChecks, Lock, Printer, RotateCcw } from 'lucide-react';
import { PageHeader } from '@/app/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CHEATSHEETS, PRE_TRADE_CHECKLIST, type Cheatsheet } from '@/content/cheatsheets';
import { courseIndex } from '@/content/courseIndex';
import { useUnlockContext } from '@/hooks/useUnlock';
import { usePageTitle } from '@/hooks/usePageTitle';
import { cn } from '@/lib/cn';
import { isModuleFinished, type UnlockContext } from '@/lib/progress/unlock';

const isOpen = (ctx: UnlockContext, sheet: Cheatsheet) => {
  if (ctx.freeMode) return true;
  const module = courseIndex.getModule(sheet.module);
  return module !== undefined && isModuleFinished(ctx, module);
};

/** /cheatsheets — pre-trade checklist and summaries unlocked module by module; printable. */
export function CheatsheetsPage() {
  usePageTitle('Шпаргалки');
  const ctx = useUnlockContext();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Шпаргалки"
        subtitle="Всё важное на одной странице"
        actions={
          <Button
            variant="secondary"
            className="print:hidden"
            leftIcon={<Printer className="size-5" aria-hidden="true" />}
            onClick={() => window.print()}
          >
            Печать
          </Button>
        }
      />
      <PreTradeChecklist />
      <div className="grid gap-4 md:grid-cols-2 print:block">
        {CHEATSHEETS.map((sheet) =>
          isOpen(ctx, sheet) ? (
            <CheatsheetCard key={sheet.id} sheet={sheet} />
          ) : (
            <LockedCard key={sheet.id} sheet={sheet} />
          ),
        )}
      </div>
    </div>
  );
}

function PreTradeChecklist() {
  const [checked, setChecked] = useState<boolean[]>(() => PRE_TRADE_CHECKLIST.map(() => false));
  const done = checked.filter(Boolean).length;
  const all = done === PRE_TRADE_CHECKLIST.length;
  return (
    <Card className="flex flex-col gap-3 break-inside-avoid">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xl font-extrabold">
          <ListChecks className="size-6 text-primary-shade" aria-hidden="true" />
          Чек-лист перед сделкой
        </h2>
        <button
          type="button"
          className="flex items-center gap-1 text-sm font-bold text-info underline print:hidden"
          onClick={() => setChecked(PRE_TRADE_CHECKLIST.map(() => false))}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Сбросить
        </button>
      </div>
      <ul className="flex flex-col gap-2">
        {PRE_TRADE_CHECKLIST.map((item, i) => (
          <li key={item}>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 size-5 shrink-0"
                checked={checked[i] ?? false}
                onChange={(e) =>
                  setChecked((prev) => prev.map((v, k) => (k === i ? e.target.checked : v)))
                }
              />
              <span className={cn(checked[i] && 'text-text-muted line-through')}>{item}</span>
            </label>
          </li>
        ))}
      </ul>
      <p
        role="status"
        className={cn(
          'flex items-center gap-2 font-bold print:hidden',
          all ? 'text-bull' : 'text-text-muted',
        )}
      >
        {all && <CheckCircle2 className="size-5" aria-hidden="true" />}
        {all
          ? 'Все пункты выполнены — можно входить по плану.'
          : `Отмечено ${done} из ${PRE_TRADE_CHECKLIST.length}. Хоть один пункт «нет» — сделку лучше пропустить.`}
      </p>
    </Card>
  );
}

function CheatsheetCard({ sheet }: { sheet: Cheatsheet }) {
  return (
    <Card className="flex flex-col gap-3 break-inside-avoid print:mb-4">
      <h2 className="text-xl font-extrabold">{sheet.title}</h2>
      {sheet.sections.map((section) => (
        <section key={section.title} className="flex flex-col gap-1">
          <h3 className="font-extrabold text-text-muted">{section.title}</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </Card>
  );
}

function LockedCard({ sheet }: { sheet: Cheatsheet }) {
  const module = courseIndex.getModule(sheet.module);
  return (
    <Card className="flex flex-col gap-2 border-dashed opacity-70 print:hidden">
      <h2 className="flex items-center gap-2 text-xl font-extrabold">
        <Lock className="size-5 text-text-muted" aria-hidden="true" />
        {sheet.title}
      </h2>
      <p className="text-sm text-text-muted">
        Откроется, когда пройдёшь модуль «{module?.title ?? sheet.module}».
      </p>
    </Card>
  );
}
