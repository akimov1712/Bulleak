import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import {
  BookOpen,
  Calculator,
  CornerDownLeft,
  FileText,
  Layers,
  ScrollText,
  Search,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { searchCommands, type CommandItem, type CommandKind } from '@/lib/search/commandSearch';
import { Modal } from '@/components/ui/Modal';
import { NAV_SECTIONS } from '@/app/layout/nav';
import { SEARCH_INDEX } from './searchIndex';

const KIND: Record<CommandKind, { label: string; icon?: LucideIcon }> = {
  page: { label: 'Раздел' },
  module: { label: 'Модуль', icon: Layers },
  lesson: { label: 'Урок', icon: FileText },
  tool: { label: 'Калькулятор', icon: Calculator },
  cheatsheet: { label: 'Шпаргалка', icon: ScrollText },
  term: { label: 'Термин', icon: BookOpen },
};

const PAGE_ICONS = new Map(
  NAV_SECTIONS.flatMap((s) => s.items).map((item) => [`page:${item.to}`, item.icon]),
);

/** Sections shown before the learner types anything. */
const QUICK = SEARCH_INDEX.filter((i) => i.kind === 'page' && PAGE_ICONS.has(i.id));

/** Site search (⌘K): lessons, terms, calculators and pages; arrows + Enter to open. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const listId = useId();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const results = useMemo(
    () => (query.trim() ? searchCommands(SEARCH_INDEX, query, 30) : QUICK),
    [query],
  );
  const current = Math.min(active, results.length - 1);

  function close() {
    setQuery('');
    setActive(0);
    onClose();
  }

  function go(item: CommandItem) {
    close();
    void navigate(item.to);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length === 0) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      const next = (current + step + results.length) % results.length;
      setActive(next);
      document.getElementById(`${listId}-${next}`)?.scrollIntoView?.({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      const item = results[current];
      if (item) {
        e.preventDefault();
        go(item);
      }
    }
  }

  return (
    <Modal open={open} onClose={close} title="Поиск по курсу" bare size="lg">
      <div className="flex items-center gap-3 border-b border-border px-4">
        <Search className="size-5 shrink-0 text-text-muted" aria-hidden="true" />
        <input
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={results[current] ? `${listId}-${current}` : undefined}
          aria-autocomplete="list"
          aria-label="Поиск по курсу"
          placeholder="Урок, термин, калькулятор…"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className="h-14 min-w-0 flex-1 bg-transparent text-base text-text outline-none placeholder:text-text-muted"
        />
      </div>
      <div className="max-h-[min(60vh,28rem)] overflow-y-auto p-2">
        {!query.trim() && (
          <p className="px-2.5 pt-1 pb-2 text-xs font-medium text-text-muted">Разделы</p>
        )}
        {results.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-text-muted">
            Ничего не нашлось. Попробуй другое слово.
          </p>
        ) : (
          <ul id={listId} role="listbox" aria-label="Результаты поиска" className="flex flex-col">
            {results.map((item, i) => {
              const Icon = PAGE_ICONS.get(item.id) ?? KIND[item.kind].icon ?? FileText;
              const selected = i === current;
              return (
                // Options are driven from the keyboard by the combobox input (arrows + Enter).
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                <li
                  key={item.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={selected}
                  onMouseMove={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => go(item)}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-(--radius-btn) px-2.5 py-2',
                    selected && 'bg-surface-2',
                  )}
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-surface text-text-muted">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-text">{item.title}</span>
                    {item.subtitle && (
                      <span className="truncate text-xs text-text-muted">{item.subtitle}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-text-muted max-sm:hidden">
                    {KIND[item.kind].label}
                  </span>
                  <CornerDownLeft
                    className={cn('size-4 shrink-0 text-text-muted', !selected && 'invisible')}
                    aria-hidden="true"
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}
