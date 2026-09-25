import { useParams } from 'react-router';
import { PagePlaceholder } from '@/app/layout/PagePlaceholder';

export function ModulePage() {
  const { moduleId } = useParams();
  return (
    <PagePlaceholder
      title={`Модуль ${moduleId ?? ''}`.trim()}
      description="Обзор модуля со списком уроков и экзаменом — этап 02."
      mood="thinking"
    />
  );
}
