import { useEffect, useId, useState, type ReactNode } from 'react';
import { Download, RotateCcw, Upload } from 'lucide-react';
import { PageHeader } from '@/app/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Segmented } from '@/components/ui/Segmented';
import { Switch } from '@/components/ui/Switch';
import { applyImport, downloadBackup, resetAll, storageSummary } from '@/features/settings/dataOps';
import { usePageTitle } from '@/hooks/usePageTitle';
import { formatNumber } from '@/lib/format';
import { parseImport, type ParsedImport } from '@/lib/io/backup';
import { useProgress } from '@/store/progressStore';
import { useSettings } from '@/store/settingsStore';
import { toast } from '@/store/uiStore';
import type { DailyGoalXp, MotionSetting, ThemeSetting } from '@/types/settings';
import { version } from '../../package.json';

const RESET_WORD = 'СБРОС';
const GOALS: readonly DailyGoalXp[] = [20, 50, 100, 150];
const dateFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-xl font-extrabold">{title}</h2>
      {children}
    </Card>
  );
}

/** /settings — profile, appearance, learning preferences and data (backup / restore / reset). */
export function SettingsPage() {
  usePageTitle('Настройки');
  const settings = useSettings();
  const name = useProgress((s) => s.profile.name);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <PageHeader title="Настройки" subtitle="Тема, цели и резервные копии" />
      <Section title="Профиль">
        <Field label="Имя" hint="Для приветствия на главной и для сертификата.">
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              value={name}
              maxLength={40}
              onChange={(e) =>
                useProgress.setState((s) => ({ profile: { ...s.profile, name: e.target.value } }))
              }
            />
          )}
        </Field>
      </Section>

      <Section title="Внешний вид">
        <Segmented<ThemeSetting>
          label="Тема"
          value={settings.theme}
          options={[
            { value: 'light', label: 'Светлая' },
            { value: 'dark', label: 'Тёмная' },
            { value: 'system', label: 'Как в системе' },
          ]}
          onChange={(theme) => settings.update({ theme })}
        />
        <Segmented<MotionSetting>
          label="Анимации"
          value={settings.reducedMotion}
          options={[
            { value: 'system', label: 'Как в системе' },
            { value: 'on', label: 'Включены' },
            { value: 'off', label: 'Минимум' },
          ]}
          onChange={(reducedMotion) => settings.update({ reducedMotion })}
        />
      </Section>

      <Section title="Обучение">
        <Segmented
          label="Цель дня"
          value={String(settings.dailyGoalXp)}
          options={GOALS.map((xp) => ({ value: String(xp), label: `${xp} XP` }))}
          onChange={(v) => {
            const dailyGoalXp = GOALS.find((g) => String(g) === v);
            if (dailyGoalXp) settings.update({ dailyGoalXp });
          }}
        />
        <Switch
          label="Звуки"
          description="Короткие звуки при наградах."
          checked={settings.sound}
          onCheckedChange={(sound) => settings.update({ sound })}
        />
        <Switch
          label="Свободный режим"
          description="Открыть все уроки сразу. Курс рассчитан на последовательное прохождение — темы опираются друг на друга."
          checked={settings.freeMode}
          onCheckedChange={(freeMode) => settings.update({ freeMode })}
        />
      </Section>

      <DataSection />
    </div>
  );
}

function DataSection() {
  const fileId = useId();
  const lastBackupAt = useProgress((s) => s.profile.lastBackupAt);
  const dispatch = useProgress((s) => s.dispatch);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof storageSummary>> | null>(null);
  const [pending, setPending] = useState<ParsedImport | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetWord, setResetWord] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void storageSummary().then((s) => alive && setSummary(s));
    return () => {
      alive = false;
    };
  }, [pending]);

  const exportNow = async () => {
    setBusy(true);
    try {
      await downloadBackup();
      dispatch({ type: 'backupMade' });
      toast({ tone: 'success', title: 'Резервная копия скачана' });
    } catch (error) {
      toast({
        tone: 'error',
        title: 'Не удалось сделать копию',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setImportError(null);
    const result = parseImport(await file.text(), Date.now());
    if (result.ok) setPending(result.data);
    else setImportError(result.error);
  };

  const confirmImport = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await applyImport(pending);
      toast({ tone: 'success', title: 'Данные восстановлены из копии' });
      setPending(null);
    } catch (error) {
      toast({
        tone: 'error',
        title: 'Восстановить не удалось — текущие данные не изменены',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const confirmReset = async () => {
    setBusy(true);
    try {
      await resetAll();
      // Stores keep their in-memory state: start over from a clean page.
      window.location.reload();
    } catch (error) {
      toast({
        tone: 'error',
        title: 'Сбросить не удалось',
        description: error instanceof Error ? error.message : undefined,
      });
      setBusy(false);
    }
  };

  return (
    <Section title="Данные">
      <p className="text-sm text-text-muted">
        Всё хранится только в этом браузере. Делай копию раз в неделю и перед очисткой браузера —
        потом её можно восстановить здесь же или на другом устройстве.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          leftIcon={<Download className="size-5" aria-hidden="true" />}
          loading={busy && !pending && !resetOpen}
          onClick={() => void exportNow()}
        >
          Скачать резервную копию
        </Button>
        <label htmlFor={fileId} className="cursor-pointer">
          <span className="inline-flex min-h-11 items-center gap-2 rounded-2xl border-2 border-border bg-surface px-4 font-extrabold hover:border-info">
            <Upload className="size-5" aria-hidden="true" />
            Восстановить из файла
          </span>
          <input
            id={fileId}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      {importError && (
        <p role="alert" className="rounded-2xl border-2 border-bear bg-bear-soft p-3 text-sm">
          {importError} Текущие данные не изменены.
        </p>
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-text-muted">Последняя копия</dt>
        <dd className="text-right font-bold">
          {lastBackupAt ? dateFormat.format(lastBackupAt) : 'ещё не делалась'}
        </dd>
        {summary && (
          <>
            <dt className="text-text-muted">Занято</dt>
            <dd className="text-right font-bold">
              ≈ {formatNumber(summary.localKb, 0)} КБ · сделок тренажёра {summary.simTrades} · в
              журнале {summary.journal}
            </dd>
          </>
        )}
        <dt className="text-text-muted">Версия сайта</dt>
        <dd className="text-right font-bold">{version}</dd>
      </dl>
      <Button
        variant="danger"
        className="self-start"
        leftIcon={<RotateCcw className="size-5" aria-hidden="true" />}
        onClick={() => {
          setResetWord('');
          setResetOpen(true);
        }}
      >
        Сбросить весь прогресс
      </Button>

      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title="Восстановить из копии?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)}>
              Отмена
            </Button>
            <Button loading={busy} onClick={() => void confirmImport()}>
              Заменить данные
            </Button>
          </>
        }
      >
        {pending && (
          <div className="flex flex-col gap-2 text-sm">
            <p>
              Копия от{' '}
              <b>
                {pending.preview.exportedAt ? dateFormat.format(pending.preview.exportedAt) : '—'}
              </b>
              : уроков пройдено {pending.preview.lessonsCompleted}, опыт {pending.preview.xp} XP,
              сделок в тренажёре {pending.preview.simTrades}, в журнале {pending.preview.journal}.
            </p>
            {pending.preview.skipped > 0 && (
              <p className="text-warn">
                {pending.preview.skipped} повреждённых записей будут пропущены.
              </p>
            )}
            <p className="font-bold">Текущие данные этого браузера будут заменены.</p>
          </div>
        )}
      </Modal>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Сбросить весь прогресс?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetOpen(false)}>
              Отмена
            </Button>
            <Button
              variant="danger"
              loading={busy}
              disabled={resetWord.trim().toUpperCase() !== RESET_WORD}
              onClick={() => void confirmReset()}
            >
              Сбросить
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 text-sm">
          <p>
            Удалятся уроки, XP, достижения, сделки тренажёра, журнал и настройки. Отменить это
            нельзя — если нужна копия, сначала скачай её.
          </p>
          <Field label={`Чтобы подтвердить, напиши «${RESET_WORD}»`}>
            {({ id }) => (
              <Input id={id} value={resetWord} onChange={(e) => setResetWord(e.target.value)} />
            )}
          </Field>
        </div>
      </Modal>
    </Section>
  );
}
