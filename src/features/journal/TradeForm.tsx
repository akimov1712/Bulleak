import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Input, Select } from '@/components/ui/Input';
import { NumberInput } from '@/components/ui/NumberInput';
import { Segmented } from '@/components/ui/Segmented';
import { Switch } from '@/components/ui/Switch';
import { cn } from '@/lib/cn';
import { formatR, formatUsd } from '@/lib/format';
import type { DraftErrors, DraftField, JournalDraft } from '@/lib/journal/draft';
import { journalResult } from '@/lib/journal/pnl';
import {
  ACCOUNT_LABEL,
  ACCOUNTS,
  EMOTION_LABEL,
  EMOTIONS,
  TIMEFRAME_LABEL,
  TIMEFRAMES,
} from './labels';

export interface TradeFormProps {
  draft: JournalDraft;
  onChange: (patch: Partial<JournalDraft>) => void;
  errors: DraftErrors;
  /** Setups already used in the journal (suggestions). */
  setups: readonly string[];
}

/** Numeric fields of the draft. */
type NumberField = {
  [K in DraftField]: JournalDraft[K] extends number | null ? K : never;
}[DraftField];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-extrabold">{title}</h2>
      {children}
    </Card>
  );
}

/** Journal trade form: instrument → entry → exit → review. */
export function TradeForm({ draft, onChange, errors, setups }: TradeFormProps) {
  const num = (field: NumberField, label: string, unit?: string) => (
    <Field label={label} error={errors[field]}>
      {({ id, describedBy, invalid }) => (
        <NumberInput
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          value={draft[field]}
          onValueChange={(v) => onChange({ [field]: v })}
          unit={unit}
          min={0}
        />
      )}
    </Field>
  );
  const date = (field: 'openedAt' | 'closedAt', label: string) => (
    <Field label={label} error={errors[field]}>
      {({ id, describedBy, invalid }) => (
        <Input
          id={id}
          type="datetime-local"
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          value={draft[field]}
          onChange={(e) => onChange({ [field]: e.target.value })}
        />
      )}
    </Field>
  );

  const preview =
    draft.entry !== null && draft.sl !== null && draft.qty !== null && draft.exit !== null
      ? journalResult({
          side: draft.side,
          entry: draft.entry,
          sl: draft.sl,
          qty: draft.qty,
          exit: draft.exit,
          fees: draft.fees ?? 0,
        })
      : null;

  return (
    <div className="flex flex-col gap-4">
      <Section title="Инструмент и счёт">
        <Segmented
          label="Счёт"
          value={draft.account}
          options={ACCOUNTS.map((a) => ({ value: a, label: ACCOUNT_LABEL[a] }))}
          onChange={(account) => onChange({ account })}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Инструмент" error={errors.symbol}>
            {({ id, describedBy }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                value={draft.symbol}
                onChange={(e) => onChange({ symbol: e.target.value })}
              />
            )}
          </Field>
          <Segmented
            label="Рынок"
            value={draft.market}
            options={[
              { value: 'perp', label: 'Бессрочные' },
              { value: 'spot', label: 'Спот' },
            ]}
            onChange={(market) => onChange({ market })}
          />
          <Segmented
            label="Направление"
            value={draft.side}
            options={[
              { value: 'long', label: 'Long' },
              { value: 'short', label: 'Short' },
            ]}
            onChange={(side) => onChange({ side })}
          />
        </div>
      </Section>

      <Section title="Вход">
        <div className="grid gap-3 sm:grid-cols-2">
          {num('entry', 'Цена входа')}
          {num('sl', 'Стоп-лосс')}
          {num('tp', 'Тейк-профит (необязательно)')}
          {num('qty', 'Объём (в монетах)')}
          {num('leverage', 'Плечо', '×')}
          {date('openedAt', 'Дата и время входа')}
        </div>
      </Section>

      <Section title="Выход">
        <p className="text-sm text-text-muted">
          Сделка ещё открыта? Оставь поля пустыми и закрой её позже.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {num('exit', 'Цена выхода')}
          {date('closedAt', 'Дата и время выхода')}
          {num('fees', 'Комиссии всего', '$')}
        </div>
        {preview && (
          <p
            aria-live="polite"
            className={cn(
              'text-2xl font-extrabold tabular-nums',
              preview.pnl > 0 ? 'text-bull' : 'text-bear',
            )}
          >
            {formatR(preview.r)} · {formatUsd(preview.pnl)}
          </p>
        )}
      </Section>

      <Section title="Разбор">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Сетап" hint="Название своей модели входа, например «tps» или «пробой».">
            {({ id, describedBy }) => (
              <>
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  list={`${id}-setups`}
                  value={draft.setup}
                  onChange={(e) => onChange({ setup: e.target.value })}
                />
                <datalist id={`${id}-setups`}>
                  {setups.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
          <Field label="Таймфрейм">
            {({ id }) => (
              <Select
                id={id}
                value={draft.timeframe}
                onValueChange={(timeframe) => onChange({ timeframe })}
                options={TIMEFRAMES.map((t) => ({ value: t, label: TIMEFRAME_LABEL[t] }))}
              />
            )}
          </Field>
        </div>
        <Segmented
          label="Эмоция при входе"
          value={draft.emotion}
          options={EMOTIONS.map((e) => ({ value: e, label: EMOTION_LABEL[e] }))}
          onChange={(emotion) => onChange({ emotion })}
        />
        <Switch
          label="Следовал торговому плану"
          description="Честно: вход, стоп, размер и выход были по правилам?"
          checked={draft.followedPlan}
          onCheckedChange={(followedPlan) => onChange({ followedPlan })}
        />
        <Field label="Заметки">
          {({ id }) => (
            <textarea
              id={id}
              rows={4}
              value={draft.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              className="rounded-2xl border-2 border-border bg-surface p-3"
            />
          )}
        </Field>
        <Field label="Теги" hint="Через запятую.">
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              value={draft.tags}
              onChange={(e) => onChange({ tags: e.target.value })}
            />
          )}
        </Field>
      </Section>
    </div>
  );
}
