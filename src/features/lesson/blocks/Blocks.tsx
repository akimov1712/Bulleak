import { useState, type ReactNode } from 'react';
import { Check, ChevronDown, Flag, Target } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ProgressBar } from '@/components/ui/ProgressBar';

/** "Что узнаешь" block at the top of a lesson. */
export function Goals({ items }: { items: string[] }) {
  return (
    <section
      aria-label="Что узнаешь"
      className="my-6 rounded-(--radius-card) border-2 border-primary bg-surface p-5 shadow-[0_4px_0_0_var(--primary-shade)]"
    >
      <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold">
        <Target className="size-6 text-primary-shade" aria-hidden="true" />
        Что узнаешь
      </h2>
      <ol className="space-y-2">
        {items.map((item, i) => (
          <li key={item} className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary font-mono text-sm font-extrabold text-on-primary">
              {i + 1}
            </span>
            <span className="pt-0.5">{item}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** "Итоги" block at the end of a lesson. Also the anchor for "lesson read" detection. */
export function Summary({ items }: { items: string[] }) {
  return (
    <section
      aria-label="Итоги урока"
      data-lesson-summary
      className="my-8 rounded-(--radius-card) border-2 border-epic bg-epic-soft p-5"
    >
      <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-epic">
        <Flag className="size-6" aria-hidden="true" />
        Итоги урока
      </h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <Check
              className="mt-0.5 size-5 shrink-0 text-epic"
              strokeWidth={3}
              aria-hidden="true"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export interface FigureProps {
  src: string;
  alt: string;
  caption?: ReactNode;
  /** Source / author line. */
  credit?: string;
}

export function Figure({ src, alt, caption, credit }: FigureProps) {
  const url = src.startsWith('http') ? src : `${import.meta.env.BASE_URL}${src.replace(/^\//, '')}`;
  return (
    <figure className="my-6">
      <img
        src={url}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="w-full rounded-2xl border-2 border-border bg-surface-2 object-cover"
      />
      {(caption || credit) && (
        <figcaption className="mt-2 text-sm text-text-muted">
          {caption}
          {credit && <span className="block text-xs opacity-80">Источник: {credit}</span>}
        </figcaption>
      )}
    </figure>
  );
}

/** Collapsible "check yourself" block (native <details>, keyboard accessible). */
export function Reveal({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group my-6 rounded-2xl border-2 border-border bg-surface open:shadow-[0_3px_0_0_var(--border)]">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-extrabold [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown
          className="size-5 shrink-0 text-text-muted transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="border-t-2 border-border px-4 py-3 [&>p]:my-2">{children}</div>
    </details>
  );
}

export function Steps({ children }: { children: ReactNode }) {
  return <ol className="relative my-6 space-y-4 [counter-reset:step]">{children}</ol>;
}

export function Step({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <li className="relative flex gap-4 [counter-increment:step] before:absolute before:top-9 before:bottom-[-1rem] before:left-[0.95rem] before:w-0.5 before:bg-border last:before:hidden">
      <span
        aria-hidden="true"
        className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 border-info bg-info-soft font-mono text-sm font-extrabold text-info before:content-[counter(step)]"
      />
      <div className="pt-0.5">
        <p className="font-extrabold">{title}</p>
        {children && <div className="text-text-muted">{children}</div>}
      </div>
    </li>
  );
}

interface CompareSide {
  title: string;
  items: string[];
}

/** Side-by-side comparison of two concepts. */
export function Compare({ left, right }: { left: CompareSide; right: CompareSide }) {
  return (
    <div className="my-6 grid gap-3 md:grid-cols-2">
      {[left, right].map((side, i) => (
        <section
          key={side.title}
          className={cn(
            'rounded-2xl border-2 p-4',
            i === 0 ? 'border-info bg-info-soft' : 'border-bull bg-bull-soft',
          )}
        >
          <h3 className={cn('mb-2 text-lg font-extrabold', i === 0 ? 'text-info' : 'text-bull')}>
            {side.title}
          </h3>
          <ul className="list-disc space-y-1 pl-5">
            {side.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function loadChecked(id: string, size: number): boolean[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(`tc-checklist:${id}`) ?? '[]');
    if (Array.isArray(raw)) return Array.from({ length: size }, (_, i) => raw[i] === true);
  } catch {
    // unavailable or corrupted storage: start unchecked
  }
  return Array.from({ length: size }, () => false);
}

/** Tickable checklist remembered per `id` in localStorage. */
export function Checklist({ id, items, title }: { id: string; items: string[]; title?: string }) {
  const [checked, setChecked] = useState(() => loadChecked(id, items.length));
  const done = checked.filter(Boolean).length;

  function toggle(index: number) {
    const next = checked.map((v, i) => (i === index ? !v : v));
    setChecked(next);
    try {
      localStorage.setItem(`tc-checklist:${id}`, JSON.stringify(next));
    } catch {
      // not persisted; still works for this visit
    }
  }

  return (
    <section
      className="my-6 rounded-2xl border-2 border-border bg-surface p-4"
      aria-label={title ?? 'Чек-лист'}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-extrabold">{title ?? 'Чек-лист'}</h3>
        <span className="font-mono text-sm font-bold text-text-muted">
          {done}/{items.length}
        </span>
      </div>
      <ProgressBar
        label="Выполнено пунктов"
        value={done / items.length}
        size="sm"
        className="mb-3"
      />
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={item}>
            <button
              type="button"
              role="checkbox"
              aria-checked={checked[i]}
              onClick={() => toggle(i)}
              className={cn(
                'flex w-full items-start gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-colors',
                checked[i] ? 'border-bull bg-bull-soft' : 'border-border hover:bg-surface-2',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2',
                  checked[i] ? 'border-bull bg-bull text-bull-soft' : 'border-text-muted/50',
                )}
              >
                {checked[i] && <Check className="size-3.5" strokeWidth={4} aria-hidden="true" />}
              </span>
              <span className={cn(checked[i] && 'text-text-muted line-through')}>{item}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
