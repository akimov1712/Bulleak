import { Link } from 'react-router';
import { paths } from '@/app/paths';
import { courseIndex } from '@/content/courseIndex';
import { getTerm, termLessonId } from '@/content/glossary';
import { formatPct } from '@/lib/format';
import { moduleLessonOfTag } from '@/lib/quiz/exam';
import { tagAccuracy, weakTopics } from '@/lib/stats/learning';
import { useProgress } from '@/store/progressStore';

const lessonOfTag = moduleLessonOfTag(courseIndex.lessons, termLessonId);

/**
 * «Стоит повторить»: the weakest quiz topics with links to their lessons. Used on the stats
 * page and in lesson m12-l04 before the final exam (`<WeakTopics/>`).
 */
export function WeakTopics({ emptyText }: { emptyText?: string }) {
  const attempts = useProgress((s) => s.quizAttempts);
  const weak = weakTopics(tagAccuracy(attempts));
  if (weak.length === 0) {
    return emptyText ? (
      <p className="my-6 rounded-2xl border-2 border-bull bg-bull-soft p-3 text-sm font-bold">
        {emptyText}
      </p>
    ) : null;
  }
  return (
    <div className="my-6 rounded-2xl border-2 border-warn bg-warn-soft p-3 text-sm">
      <p className="font-extrabold">Стоит повторить</p>
      <ul className="mt-1 flex flex-col gap-1">
        {weak.map((w) => {
          const lesson = lessonOfTag(w.tag);
          return (
            <li key={w.tag}>
              {getTerm(w.tag)?.term ?? w.tag} — {formatPct(w.ratio, 0)}
              {lesson && (
                <>
                  {' · '}
                  <Link to={paths.lesson(lesson)} className="font-bold text-info underline">
                    урок «{courseIndex.getLesson(lesson)?.title}»
                  </Link>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
