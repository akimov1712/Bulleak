import { useEffect, useState, type RefObject } from 'react';
import { cn } from '@/lib/cn';

interface Heading {
  id: string;
  text: string;
}

/** Sticky outline of the lesson's h2 headings with the current section highlighted. */
export function TableOfContents({ container }: { container: RefObject<HTMLElement | null> }) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [active, setActive] = useState<string | null>(null);

  // Collect headings once the lazily loaded MDX has rendered (and if it re-renders).
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const collect = () => {
      const found = [...root.querySelectorAll<HTMLElement>('h2[data-toc]')].map((h) => ({
        id: h.id,
        text: h.textContent ?? '',
      }));
      setHeadings((prev) =>
        prev.length === found.length && prev.every((h, i) => h.id === found[i]?.id) ? prev : found,
      );
    };
    collect();
    const observer = new MutationObserver(collect);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [container]);

  useEffect(() => {
    if (headings.length === 0 || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).map((e) => e.target.id);
        if (visible[0]) setActive(visible[0]);
      },
      { rootMargin: '-80px 0px -65% 0px' },
    );
    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  return (
    <nav aria-label="Содержание урока" className="sticky top-24 flex flex-col gap-1 text-sm">
      <p className="mb-1 font-extrabold tracking-wide text-text-muted uppercase">Содержание</p>
      {headings.map((h) => (
        <a
          key={h.id}
          href={`#${h.id}`}
          onClick={(e) => {
            // Hash routing owns location.hash, so scroll manually instead of navigating.
            e.preventDefault();
            document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          aria-current={active === h.id ? 'location' : undefined}
          className={cn(
            'rounded-lg border-l-4 px-3 py-1.5 font-bold transition-colors',
            active === h.id
              ? 'border-primary bg-surface-2 text-text'
              : 'border-transparent text-text-muted hover:text-text',
          )}
        >
          {h.text}
        </a>
      ))}
    </nav>
  );
}
