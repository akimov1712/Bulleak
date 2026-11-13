import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { BookOpen, Send, Square, Trash2 } from 'lucide-react';
import { AI_MESSAGE_MAX_CHARS, type AiSource } from '@bulleak/shared';
import { paths } from '@/app/paths';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Modal } from '@/components/ui/Modal';
import { inputClass } from '@/components/ui/styles';
import { courseIndex } from '@/content/courseIndex';
import { lessonIdFromPathname, plainAnswer, suggestions, type ChatMessage } from '@/lib/ai/chat';
import { cn } from '@/lib/cn';
import { useAuth } from '@/store/authStore';
import { useAssistant } from './assistantStore';

const sourceLink = (s: AiSource) =>
  s.kind === 'lesson'
    ? paths.lesson(s.ref)
    : s.kind === 'term'
      ? paths.glossary(s.ref)
      : paths.cheatsheets();

/** One-tap follow-ups under the last answer (T-2305). */
const FOLLOW_UPS = ['Объясни проще', 'Приведи пример с числами', 'Подробнее'] as const;

function Bubble({ message, onNavigate }: { message: ChatMessage; onNavigate: () => void }) {
  const mine = message.role === 'user';
  return (
    <li className={cn('flex flex-col gap-2', mine ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[88%] rounded-2xl px-4 py-2.5 text-[0.95rem] leading-relaxed whitespace-pre-wrap',
          mine
            ? 'bg-primary text-on-primary'
            : message.status === 'error'
              ? 'border border-bear/40 bg-bear/10 text-text'
              : 'bg-surface-2 text-text',
        )}
      >
        {mine ? message.text : plainAnswer(message.text)}
        {message.status === 'streaming' && (
          <span
            className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-text-muted align-middle"
            aria-hidden="true"
          />
        )}
      </div>
      {message.sources && message.sources.length > 0 && (
        <div className="flex max-w-[88%] flex-wrap gap-1.5" aria-label="Источники в курсе">
          {message.sources.map((s) => (
            <Link
              key={`${s.kind}:${s.ref}`}
              to={sourceLink(s)}
              onClick={onNavigate}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-text-muted hover:bg-surface-2 hover:text-text"
            >
              <BookOpen className="size-3.5" aria-hidden="true" />
              {s.title}
            </Link>
          ))}
        </div>
      )}
    </li>
  );
}

/** The assistant dialog (T-2301): asks the API, shows the answer as it is written. */
export function AssistantPanel() {
  const { open, messages, remaining, enabled, busy, setOpen, refreshStatus, ask, stop, clear } =
    useAssistant();
  const user = useAuth((s) => s.user);
  const { pathname } = useLocation();
  const lessonId = lessonIdFromPathname(pathname);
  const lessonTitle = lessonId ? courseIndex.getLesson(lessonId)?.title : undefined;
  const context = lessonTitle ? { lessonTitle } : {};
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLUListElement>(null);
  const close = () => setOpen(false);

  useEffect(() => {
    if (open && user) void refreshStatus();
  }, [open, user, refreshStatus]);

  const last = messages.at(-1);
  useEffect(() => {
    const list = listRef.current;
    if (list && typeof list.scrollTo === 'function') list.scrollTo({ top: list.scrollHeight });
  }, [messages.length, last?.text]);

  const send = (text: string) => {
    if (!text.trim() || busy) return;
    setDraft('');
    void ask(text, context);
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(draft);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(draft);
    }
  };

  const outOfQuestions = remaining === 0;
  const canAsk = Boolean(user) && enabled && !outOfQuestions;

  return (
    <Modal open={open} onClose={close} title="Помощник по курсу" size="lg">
      {!user ? (
        <div className="flex flex-col gap-4 py-2">
          <p>
            Помощник отвечает на вопросы по урокам курса. Чтобы задать вопрос, войди в аккаунт — так
            мы считаем дневной лимит вопросов.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to={paths.login()} onClick={close} className="font-semibold text-primary">
              Войти
            </Link>
            <Link to={paths.register()} onClick={close} className="font-semibold text-primary">
              Создать аккаунт
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {lessonTitle && (
            <p className="text-sm text-text-muted">
              Сейчас ты в уроке «{lessonTitle}» — помощник это учтёт.
            </p>
          )}
          {messages.length === 0 ? (
            <div className="flex flex-col gap-2 py-2">
              <p className="text-text-muted">Спроси что-нибудь по курсу. Например:</p>
              {suggestions(context).map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={!canAsk}
                  onClick={() => send(q)}
                  className="rounded-xl border border-border px-3 py-2 text-left hover:bg-surface-2 disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          ) : (
            <ul
              ref={listRef}
              aria-live="polite"
              aria-label="Диалог с помощником"
              className="flex max-h-[50dvh] flex-col gap-3 overflow-y-auto pr-1"
            >
              {messages.map((m) => (
                <Bubble key={m.id} message={m} onNavigate={close} />
              ))}
              {last?.role === 'assistant' && last.status === 'done' && canAsk && !busy && (
                <li className="flex flex-wrap gap-1.5" aria-label="Уточнить ответ">
                  {FOLLOW_UPS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => send(q)}
                      className="rounded-full border border-border px-3 py-1 text-sm hover:bg-surface-2"
                    >
                      {q}
                    </button>
                  ))}
                </li>
              )}
            </ul>
          )}

          {!enabled && (
            <p className="text-sm text-bear">Помощник сейчас выключен. Загляни позже.</p>
          )}
          {outOfQuestions && (
            <p className="text-sm text-bear">На сегодня вопросы закончились. Возвращайся завтра.</p>
          )}

          <form onSubmit={onSubmit} className="flex items-end gap-2">
            <label htmlFor="assistant-question" className="sr-only">
              Вопрос помощнику
            </label>
            <textarea
              id="assistant-question"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              maxLength={AI_MESSAGE_MAX_CHARS}
              rows={2}
              disabled={!canAsk}
              placeholder="Например: где ставить стоп в лонге?"
              className={cn(inputClass, 'min-h-14 flex-1 resize-none py-2')}
            />
            {busy ? (
              <IconButton
                label="Остановить ответ"
                icon={<Square className="size-5" />}
                variant="surface"
                onClick={stop}
              />
            ) : (
              <IconButton
                label="Отправить"
                icon={<Send className="size-5" />}
                variant="surface"
                type="submit"
                disabled={!canAsk || !draft.trim()}
              />
            )}
          </form>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
            <span>
              {remaining !== null && `Вопросов на сегодня: ${remaining}. `}
              Помощник может ошибаться и не даёт инвестиционных советов.
            </span>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Trash2 className="size-4" />}
                onClick={clear}
              >
                Новый диалог
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
