import { Link, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/app/layout/PageHeader';
import { paths } from '@/app/paths';
import { Mascot } from '@/components/mascot/Mascot';
import { EmptyState } from '@/components/ui/Skeleton';
import { buttonClass } from '@/components/ui/styles';
import { CALCULATOR_LIST, getCalculator } from '@/features/calculators/registry';
import { usePageTitle } from '@/hooks/usePageTitle';

/** /tools — list of calculators; /tools/:calcId — one calculator. */
export function ToolsPage() {
  const { calcId } = useParams();
  const calc = calcId ? getCalculator(calcId) : undefined;
  usePageTitle(calc ? calc.title : 'Инструменты');

  if (calcId && !calc) {
    return (
      <EmptyState
        headingLevel={1}
        art={<Mascot mood="shocked" size={130} />}
        title="Такого калькулятора нет"
        action={
          <Link to={paths.tools()} className={buttonClass()}>
            Ко всем калькуляторам
          </Link>
        }
      />
    );
  }

  if (calc) {
    const Calc = calc.component;
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <Link
          to={paths.tools()}
          className="flex items-center gap-1 self-start font-bold text-info hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Все калькуляторы
        </Link>
        <PageHeader title={calc.title} subtitle={calc.description} />
        <Calc />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Инструменты" subtitle="Калькуляторы трейдера" />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CALCULATOR_LIST.map((c) => {
          const Icon = c.icon;
          return (
            <li key={c.id}>
              <Link
                to={paths.tools(c.id)}
                className="flex h-full flex-col gap-2 rounded-(--radius-card) border-2 border-border bg-surface p-4 transition-colors hover:border-info"
              >
                <Icon className="size-7 text-primary-shade" aria-hidden="true" />
                <span className="text-lg font-extrabold">{c.title}</span>
                <span className="text-sm text-text-muted">{c.description}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
