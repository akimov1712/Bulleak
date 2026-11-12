import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { PageHeader } from '@/app/layout/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { DrillPanel } from '@/features/practice/DrillPanel';
import { ForecastPanel } from '@/features/practice/ForecastPanel';
import { SituationsPanel } from '@/features/practice/SituationsPanel';
import { usePageTitle } from '@/hooks/usePageTitle';

type Tab = 'drills' | 'forecast' | 'situations';
const TABS: readonly Tab[] = ['drills', 'forecast', 'situations'];

/** Practice modes (stage 25): skill drills and «Что дальше?». */
export function PracticePage() {
  usePageTitle('Практика');
  const [search] = useSearchParams();
  // ?seed=123 reproduces the tasks (tests, sharing a moment).
  const [seed] = useState(() => {
    const fromUrl = Number(search.get('seed'));
    return Number.isInteger(fromUrl) && fromUrl > 0 ? fromUrl : Date.now();
  });
  const [tab, setTab] = useState<Tab>(() => TABS.find((t) => t === search.get('tab')) ?? 'drills');
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Практика"
        subtitle="Короткие тренировки: расчёты до автоматизма и прогнозы на реальной истории"
      />
      <Tabs<Tab>
        label="Режим практики"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'drills', label: 'Навыки' },
          { id: 'forecast', label: 'Что дальше?' },
          { id: 'situations', label: 'Ситуации' },
        ]}
      />
      {tab === 'drills' && <DrillPanel seed={seed} />}
      {tab === 'forecast' && <ForecastPanel seed={seed} />}
      {tab === 'situations' && <SituationsPanel />}
    </div>
  );
}
