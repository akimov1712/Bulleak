import { useParams } from 'react-router';
import { PagePlaceholder } from '@/app/layout/PagePlaceholder';

export function LessonPage() {
  const { lessonId } = useParams();
  return (
    <PagePlaceholder
      title={`Урок ${lessonId ?? ''}`.trim()}
      description="Плеер урока с графиками, схемами и интерактивом — этап 02."
      mood="thinking"
    />
  );
}
