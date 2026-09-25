import { useParams } from 'react-router';
import { PagePlaceholder } from '@/app/layout/PagePlaceholder';

export function ExamPage() {
  const { moduleId } = useParams();
  return (
    <PagePlaceholder
      title={`Экзамен ${moduleId ?? ''}`.trim()}
      description="Экзамен модуля или финальный экзамен — этапы 04 и 08."
      mood="thinking"
    />
  );
}
