import { Printer } from 'lucide-react';
import { PageHeader } from '@/app/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { StrategyEditor } from '@/features/plan/StrategyEditor';
import { TradingPlanEditor } from '@/features/plan/TradingPlanEditor';
import { usePageTitle } from '@/hooks/usePageTitle';

/** /plan — the learner's written trading plan and strategy; printable. */
export function PlanPage() {
  usePageTitle('Торговый план');
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHeader
        title="Торговый план"
        subtitle="Твои правила: когда, что и как торговать"
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
      <TradingPlanEditor />
      <StrategyEditor />
    </div>
  );
}
