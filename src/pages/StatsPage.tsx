import { useState } from 'react';
import { PageHeader } from '@/app/layout/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { LearningStats } from '@/features/stats/LearningStats';
import { DisciplineStats } from '@/features/stats/DisciplineStats';
import { QuizStats } from '@/features/stats/QuizStats';
import { JournalStats, SimulatorStats } from '@/features/stats/TradingStats';
import { usePageTitle } from '@/hooks/usePageTitle';

type Tab = 'learning' | 'quizzes' | 'discipline' | 'simulator' | 'journal';

const TABS = [
  { id: 'learning', label: 'Обучение' },
  { id: 'quizzes', label: 'Тесты' },
  { id: 'discipline', label: 'Дисциплина' },
  { id: 'simulator', label: 'Тренажёр' },
  { id: 'journal', label: 'Журнал' },
] as const;

/** /stats — learning, simulator and journal statistics. */
export function StatsPage() {
  usePageTitle('Статистика');
  const [tab, setTab] = useState<Tab>('learning');
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Статистика" subtitle="Как идёт обучение и торговля" />
      <Tabs items={TABS} value={tab} onChange={setTab} label="Разделы статистики" />
      <div role="tabpanel" aria-label={TABS.find((t) => t.id === tab)?.label}>
        {tab === 'learning' && <LearningStats />}
        {tab === 'quizzes' && <QuizStats />}
        {tab === 'discipline' && <DisciplineStats />}
        {tab === 'simulator' && <SimulatorStats />}
        {tab === 'journal' && <JournalStats />}
      </div>
    </div>
  );
}
