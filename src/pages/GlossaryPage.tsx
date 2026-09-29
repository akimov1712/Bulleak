import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, BookOpen, Lock, Search } from 'lucide-react';
import { PageHeader } from '@/app/layout/PageHeader';
import { paths } from '@/app/paths';
import { Mascot } from '@/components/mascot/Mascot';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/Skeleton';
import { courseIndex } from '@/content/courseIndex';
import { GLOSSARY_CATEGORIES, getTerm, glossary } from '@/content/glossary';
import { useUnlockContext } from '@/hooks/useUnlock';
import { usePageTitle } from '@/hooks/usePageTitle';
import { cn } from '@/lib/cn';
import { plural } from '@/lib/format';
import { alphabetGroups, searchTerms } from '@/lib/glossary/search';
import { lessonStatus, type UnlockContext } from '@/lib/progress/unlock';
import { useProgress } from '@/store/progressStore';
import type { GlossaryCategory, GlossaryTerm } from '@/types/glossary';

const chip = (active: boolean) =>
  cn(
    'rounded-full border-2 px-3 py-1 text-sm font-bold transition-colors',
    active ? 'border-info bg-info/15 text-info' : 'border-border bg-surface hover:border-info',
  );

/** Term not studied yet (its lesson is not completed) — still readable, marked «впереди». */
const isAhead = (ctx: UnlockContext, term: GlossaryTerm) =>
  lessonStatus(ctx, term.lessonId) !== 'completed';

/** /glossary — search, categories, A–Я index; /glossary/:termId — one term. */
export function GlossaryPage() {
  const { termId } = useParams();
  const term = termId ? getTerm(termId) : undefined;
  usePageTitle(term ? term.term : 'Глоссарий');

  if (termId && !term) {
    return (
      <EmptyState
        headingLevel={1}
        art={<Mascot mood="shocked" size={130} />}
        title="Такого термина нет"
        action={
          <Link to={paths.glossary()} className="font-bold text-info underline">
            Ко всему глоссарию
          </Link>
        }
      />
    );
  }
  return term ? <TermDetail key={term.id} term={term} /> : <GlossaryList />;
}

function GlossaryList() {
  const ctx = useUnlockContext();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<GlossaryCategory | 'all'>('all');
  const inCategory = useMemo(
    () => (category === 'all' ? glossary : glossary.filter((t) => t.category === category)),
    [category],
  );
  const found = searchTerms(inCategory, query);
  const categories = (Object.keys(GLOSSARY_CATEGORIES) as GlossaryCategory[]).filter((c) =>
    glossary.some((t) => t.category === c),
  );
  const groups = query.trim() === '' ? alphabetGroups(found) : null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Глоссарий"
        subtitle={`${glossary.length} ${plural(glossary.length, ['термин', 'термина', 'терминов'])} трейдинга`}
      />
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-text-muted"
          aria-hidden="true"
        />
        <Input
          type="search"
          aria-label="Поиск по глоссарию"
          placeholder="Например: плечо, SL, ликвидация"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>
      <div role="group" aria-label="Категории" className="flex flex-wrap gap-1.5">
        <button
          type="button"
          aria-pressed={category === 'all'}
          className={chip(category === 'all')}
          onClick={() => setCategory('all')}
        >
          Все
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={category === c}
            className={chip(category === c)}
            onClick={() => setCategory(c)}
          >
            {GLOSSARY_CATEGORIES[c]}
          </button>
        ))}
      </div>

      {found.length === 0 ? (
        <EmptyState
          art={<Mascot mood="thinking" size={110} />}
          title="Ничего не нашлось"
          description="Попробуй другое слово или английское название термина."
        />
      ) : groups ? (
        <>
          <nav aria-label="Алфавитный указатель" className="flex flex-wrap gap-1">
            {groups.map(([letter]) => (
              <button
                key={letter}
                type="button"
                className="min-h-11 min-w-11 rounded-lg border-2 border-border px-2 text-sm font-extrabold hover:border-info"
                onClick={() =>
                  document
                    .getElementById(`letter-${letter}`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              >
                {letter}
              </button>
            ))}
          </nav>
          {groups.map(([letter, list]) => (
            <section key={letter} aria-labelledby={`letter-${letter}`} className="scroll-mt-20">
              <h2 id={`letter-${letter}`} className="mb-2 text-xl font-extrabold">
                {letter}
              </h2>
              <TermList terms={list} ctx={ctx} />
            </section>
          ))}
        </>
      ) : (
        <TermList terms={found} ctx={ctx} />
      )}
    </div>
  );
}

function TermList({ terms, ctx }: { terms: GlossaryTerm[]; ctx: UnlockContext }) {
  return (
    <ul className="grid gap-2 md:grid-cols-2">
      {terms.map((t) => (
        <li key={t.id}>
          <Link
            to={paths.glossary(t.id)}
            className="flex h-full flex-col gap-1 rounded-2xl border-2 border-border bg-surface p-3 hover:border-info"
          >
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold">{t.term}</span>
              {isAhead(ctx, t) && (
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-bold text-text-muted">
                  впереди
                </span>
              )}
            </span>
            <span className="text-sm text-text-muted">{t.short}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function TermDetail({ term }: { term: GlossaryTerm }) {
  const ctx = useUnlockContext();
  const dispatch = useProgress((s) => s.dispatch);
  // Counts unique terms for the glossary achievement (repeat views are ignored by the pipeline).
  useEffect(() => {
    dispatch({ type: 'glossaryViewed', termId: term.id });
  }, [dispatch, term.id]);

  const lesson = courseIndex.getLesson(term.lessonId);
  const status = lessonStatus(ctx, term.lessonId);
  const related = term.related.map(getTerm).filter((t): t is GlossaryTerm => t !== undefined);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link
        to={paths.glossary()}
        className="flex min-h-11 items-center gap-1 self-start font-bold text-info hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Весь глоссарий
      </Link>
      <PageHeader
        title={term.term}
        subtitle={
          term.aliases.length > 0
            ? `${GLOSSARY_CATEGORIES[term.category]} · ${term.aliases.join(', ')}`
            : GLOSSARY_CATEGORIES[term.category]
        }
      />
      <Card className="flex flex-col gap-3">
        <p className="text-lg font-bold">{term.short}</p>
        {term.full.split(/\n\s*\n/).map((paragraph) => (
          <p key={paragraph.slice(0, 40)}>{paragraph}</p>
        ))}
      </Card>
      {lesson && (
        <p className="flex items-center gap-2 text-sm">
          {status === 'locked' ? (
            <>
              <Lock className="size-4 text-text-muted" aria-hidden="true" />
              <span className="text-text-muted">
                Изучается в уроке «{lesson.title}» — он откроется по ходу курса.
              </span>
            </>
          ) : (
            <>
              <BookOpen className="size-4 text-info" aria-hidden="true" />
              <span>
                Изучается в уроке{' '}
                <Link to={paths.lesson(lesson.id)} className="font-bold text-info hover:underline">
                  «{lesson.title}»
                </Link>
                {status === 'completed' ? '' : ' — впереди'}
              </span>
            </>
          )}
        </p>
      )}
      {related.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-extrabold">Связанные термины</h2>
          <div className="flex flex-wrap gap-1.5">
            {related.map((r) => (
              <Link key={r.id} to={paths.glossary(r.id)} className={chip(false)}>
                {r.term}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
