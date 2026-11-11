import { Link } from 'react-router';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { cardClass, buttonClass } from '@/components/ui/styles';
import { REVIEW_QUESTIONS } from '@/lib/learner/review';
import { paths } from '@/app/paths';
import { useDueReviews } from './useDueReviews';

/** «Сегодня повторить» on the home page; hidden when nothing is due. */
export function ReviewCard({ className }: { className?: string }) {
  const due = useDueReviews();
  if (due.length === 0) return null;
  return (
    <section
      aria-labelledby="review-card-title"
      className={cn(cardClass({ padding: 'md' }), 'flex flex-col gap-3', className)}
    >
      <h2 id="review-card-title" className="flex items-center gap-2 font-semibold">
        <RotateCcw className="size-5 text-info" aria-hidden="true" />
        Сегодня повторить
      </h2>
      <p className="text-sm text-text-muted">
        Короткое повторение помогает не забыть пройденное. {REVIEW_QUESTIONS} вопросов по навыкам:
      </p>
      <ul className="flex flex-wrap gap-2">
        {due.map((d) => (
          <li
            key={d.skill}
            className="rounded-full border border-border bg-surface-2 px-3 py-1 text-sm font-semibold"
          >
            {d.title}
          </li>
        ))}
      </ul>
      <Link to={paths.review()} className={buttonClass({ fullWidth: true })}>
        Повторить
      </Link>
    </section>
  );
}
