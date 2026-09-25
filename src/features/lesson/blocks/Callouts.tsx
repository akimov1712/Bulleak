import type { ReactNode } from 'react';
import { AlertTriangle, Building2, Calculator, Lightbulb, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

type CalloutTone = 'tip' | 'warning' | 'example' | 'bybit';

const tones: Record<CalloutTone, { icon: LucideIcon; label: string; box: string; title: string }> =
  {
    tip: { icon: Lightbulb, label: 'Совет', box: 'border-info bg-info-soft', title: 'text-info' },
    warning: {
      icon: AlertTriangle,
      label: 'Осторожно',
      box: 'border-warn bg-warn-soft',
      title: 'text-warn',
    },
    example: {
      icon: Calculator,
      label: 'Пример',
      box: 'border-bull bg-bull-soft',
      title: 'text-bull',
    },
    bybit: {
      icon: Building2,
      label: 'На Bybit',
      box: 'border-epic bg-epic-soft',
      title: 'text-epic',
    },
  };

interface CalloutProps {
  title?: string;
  children: ReactNode;
}

function Callout({ tone, title, children }: CalloutProps & { tone: CalloutTone }) {
  const t = tones[tone];
  const Icon = t.icon;
  return (
    <aside
      className={cn('my-6 rounded-2xl border-2 border-l-[6px] px-4 py-3.5 md:px-5', t.box)}
      aria-label={title ?? t.label}
    >
      <p className={cn('mb-1 flex items-center gap-2 font-extrabold', t.title)}>
        <Icon className="size-5 shrink-0" aria-hidden="true" />
        {title ?? t.label}
      </p>
      <div className="[&>p]:my-2 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0">{children}</div>
    </aside>
  );
}

export const Tip = (props: CalloutProps) => <Callout tone="tip" {...props} />;
export const Warning = (props: CalloutProps) => <Callout tone="warning" {...props} />;
export const Example = (props: CalloutProps) => <Callout tone="example" {...props} />;
export const BybitNote = (props: CalloutProps) => <Callout tone="bybit" {...props} />;
