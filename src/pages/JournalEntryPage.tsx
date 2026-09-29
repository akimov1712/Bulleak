import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useDbQuery } from '@/db/useDbQuery';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { PageHeader } from '@/app/layout/PageHeader';
import { paths } from '@/app/paths';
import { Mascot } from '@/components/mascot/Mascot';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, PageSkeleton } from '@/components/ui/Skeleton';
import { buttonClass } from '@/components/ui/styles';
import { journalRepo } from '@/db/journalRepo';
import { TradeForm } from '@/features/journal/TradeForm';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  draftToTrade,
  emptyDraft,
  tradeToDraft,
  type DraftErrors,
  type JournalDraft,
} from '@/lib/journal/draft';
import { useProgress } from '@/store/progressStore';
import { toast } from '@/store/uiStore';
import type { JournalTrade } from '@/types/trading';

type Loaded = { trade: JournalTrade | null; setups: string[] } | { error: string };

/** /journal/new and /journal/:id — add, edit, close or delete a journal trade. */
export function JournalEntryPage() {
  const { entryId = 'new' } = useParams();
  const isNew = entryId === 'new';
  const id = Number(entryId);
  usePageTitle(isNew ? 'Новая сделка' : 'Сделка');

  const loaded = useDbQuery<Loaded>(async () => {
    try {
      const all = await journalRepo.list();
      const setups = [...new Set(all.map((t) => t.setup).filter(Boolean))].sort();
      if (isNew) return { trade: null, setups };
      return { trade: all.find((t) => t.id === id) ?? null, setups };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Не удалось загрузить журнал.' };
    }
  }, [isNew, id]);

  if (loaded === undefined) return <PageSkeleton />;
  if ('error' in loaded) {
    return <EmptyState headingLevel={1} title="Журнал недоступен" description={loaded.error} />;
  }
  if (!isNew && !loaded.trade) {
    return (
      <EmptyState
        headingLevel={1}
        art={<Mascot mood="shocked" size={130} />}
        title="Сделка не найдена"
        action={
          <Link to={paths.journal()} className={buttonClass()}>
            В журнал
          </Link>
        }
      />
    );
  }
  return <Editor key={entryId} existing={loaded.trade} setups={loaded.setups} />;
}

function Editor({ existing, setups }: { existing: JournalTrade | null; setups: string[] }) {
  const navigate = useNavigate();
  const dispatch = useProgress((s) => s.dispatch);
  const [draft, setDraft] = useState<JournalDraft>(() =>
    existing ? tradeToDraft(existing) : emptyDraft(Date.now()),
  );
  const [errors, setErrors] = useState<DraftErrors>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async () => {
    const result = draftToTrade(draft);
    if (!result.ok) {
      setErrors(result.errors);
      toast({
        tone: 'error',
        title: 'Проверь поля формы',
        description: 'Ошибки отмечены красным.',
      });
      return;
    }
    setSaving(true);
    try {
      const wasClosed = existing?.pnl !== undefined;
      const nowClosed = result.trade.pnl !== undefined;
      if (existing?.id !== undefined) await journalRepo.update(existing.id, result.trade);
      else await journalRepo.add(result.trade);
      // XP and counters once per trade: when it gets closed (new closed or open → closed).
      if (nowClosed && !wasClosed) {
        dispatch({
          type: 'journalEntry',
          closed: true,
          forward: result.trade.account === 'testnet',
          followedPlan: result.trade.followedPlan,
        });
      }
      toast({
        tone: 'success',
        title: nowClosed ? 'Сделка записана' : 'Открытая сделка сохранена',
      });
      navigate(paths.journal());
    } catch (error) {
      toast({
        tone: 'error',
        title: 'Сделка не сохранилась',
        description: error instanceof Error ? error.message : undefined,
      });
      setSaving(false);
    }
  };

  const remove = async () => {
    if (existing?.id === undefined) return;
    try {
      await journalRepo.remove(existing.id);
      toast({ tone: 'info', title: 'Сделка удалена' });
      navigate(paths.journal());
    } catch (error) {
      toast({
        tone: 'error',
        title: 'Не удалось удалить',
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <form
      className="mx-auto flex max-w-3xl flex-col gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <Link
        to={paths.journal()}
        className="flex min-h-11 items-center gap-1 self-start font-bold text-info hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Журнал
      </Link>
      <PageHeader
        title={existing ? 'Сделка' : 'Новая сделка'}
        subtitle={
          existing
            ? `${existing.symbol} · ${existing.side === 'long' ? 'Long' : 'Short'}`
            : undefined
        }
      />
      <TradeForm
        draft={draft}
        onChange={(patch) => {
          setDraft((d) => ({ ...d, ...patch }));
          // Errors are re-checked on the next save; hide them while the learner fixes the form.
          setErrors({});
        }}
        errors={errors}
        setups={setups}
      />
      <div className="flex flex-wrap justify-between gap-3">
        {existing ? (
          <Button
            type="button"
            variant="danger"
            leftIcon={<Trash2 className="size-5" aria-hidden="true" />}
            onClick={() => setConfirmDelete(true)}
          >
            Удалить
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" size="lg" loading={saving}>
          Сохранить
        </Button>
      </div>
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Удалить сделку?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Отмена
            </Button>
            <Button variant="danger" onClick={() => void remove()}>
              Удалить
            </Button>
          </>
        }
      >
        <p className="text-text-muted">
          Запись исчезнет из журнала и статистики. Если нужна копия — сначала сделай экспорт в
          настройках.
        </p>
      </Modal>
    </form>
  );
}
