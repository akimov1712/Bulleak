import { Link } from 'react-router';
import { Lock } from 'lucide-react';
import { Mascot } from '@/components/mascot/Mascot';
import { buttonClass } from '@/components/ui/styles';
import { paths } from '@/app/paths';
import type { LessonMeta } from '@/types/course';

/** Shown when a locked lesson is opened by direct link. */
export function LockedLesson({ lesson, next }: { lesson: LessonMeta; next?: LessonMeta }) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <Mascot mood="thinking" size={150} />
      <p className="flex items-center gap-2 text-sm font-extrabold tracking-wide text-text-muted uppercase">
        <Lock className="size-4" aria-hidden="true" />
        Урок пока закрыт
      </p>
      <h1 className="max-w-xl text-3xl font-extrabold">{lesson.title}</h1>
      <p className="max-w-md text-lg text-text-muted">
        Уроки открываются по порядку: сначала пройди тест предыдущего урока. Так знания ложатся
        слоями и ничего не теряется.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {next && (
          <Link to={paths.lesson(next.id)} className={buttonClass()}>
            К уроку «{next.title}»
          </Link>
        )}
        <Link to={paths.path()} className={buttonClass({ variant: 'secondary' })}>
          Карта курса
        </Link>
      </div>
      <p className="text-sm text-text-muted">
        Хочешь пройти курс в своём порядке? Включи свободный режим в{' '}
        <Link to={paths.settings()} className="font-bold text-info hover:underline">
          настройках
        </Link>
        .
      </p>
    </div>
  );
}
