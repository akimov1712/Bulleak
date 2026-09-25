import { useParams } from 'react-router';
import { PagePlaceholder } from '@/app/layout/PagePlaceholder';

export function QuizPage() {
  const { lessonId } = useParams();
  return (
    <PagePlaceholder
      title={`Тест урока ${lessonId ?? ''}`.trim()}
      description="Тест из 8–12 вопросов с мгновенной обратной связью — этап 02."
      mood="thinking"
    />
  );
}
