import { useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { DELETE_CONFIRM_WORD } from '@bulleak/shared';
import { ApiError, type ApiClient } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { downloadFile } from '@/features/io/download';
import { useAuth } from '@/store/authStore';
import { toast } from '@/store/uiStore';

const errorText = (error: unknown) => (error instanceof Error ? error.message : undefined);

/** File name of «Скачать мои данные»: bulleak-account-2026-11-12.json. */
const accountExportFileName = (date: Date) =>
  `bulleak-account-${date.toISOString().slice(0, 10)}.json`;

/** Settings → «Аккаунт»: download the server copy of the data and delete the account (U8, U9). */
export function AccountDataActions({ api }: { api: ApiClient }) {
  const setUser = useAuth((s) => s.setUser);
  const [exporting, setExporting] = useState(false);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [word, setWord] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const close = () => {
    setOpen(false);
    setPassword('');
    setWord('');
    setError(null);
  };

  const confirmed = word.trim().toUpperCase() === DELETE_CONFIRM_WORD;

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <h3 className="font-semibold">Мои данные</h3>
      <p className="text-sm text-text-muted">
        На сервере хранятся имя, e-mail, прогресс, настройки, сделки тренажёра и журнал.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          loading={exporting}
          leftIcon={<Download className="size-4" aria-hidden="true" />}
          onClick={() => {
            setExporting(true);
            api.exportAccount().then(
              (data) => {
                setExporting(false);
                downloadFile(
                  accountExportFileName(new Date()),
                  new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
                );
              },
              (e: unknown) => {
                setExporting(false);
                toast({ tone: 'error', title: 'Не удалось скачать', description: errorText(e) });
              },
            );
          }}
        >
          Скачать мои данные
        </Button>
        <Button
          variant="ghost"
          className="text-bear"
          leftIcon={<Trash2 className="size-4" aria-hidden="true" />}
          onClick={() => setOpen(true)}
        >
          Удалить аккаунт
        </Button>
      </div>

      <Modal
        open={open}
        onClose={close}
        title="Удалить аккаунт?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Отмена
            </Button>
            <Button
              variant="danger"
              loading={pending}
              disabled={!confirmed || !password}
              onClick={() => {
                setPending(true);
                setError(null);
                api.deleteAccount({ password, confirm: word }).then(
                  () => {
                    setPending(false);
                    close();
                    setUser(null);
                    toast({ tone: 'info', title: 'Аккаунт удалён' });
                  },
                  (e: unknown) => {
                    setPending(false);
                    setError(
                      e instanceof ApiError && e.fields.password
                        ? e.fields.password
                        : (errorText(e) ?? 'Не получилось'),
                    );
                  },
                );
              }}
            >
              Удалить навсегда
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p>
            Аккаунт и все данные на сервере удалятся сразу, восстановить их будет нельзя. Прогресс
            на этом устройстве останется — как у гостя.
          </p>
          <Field label="Пароль" error={error}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="password"
                autoComplete="current-password"
                value={password}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </Field>
          <Field label={`Напиши ${DELETE_CONFIRM_WORD}, чтобы подтвердить`}>
            {({ id, describedBy }) => (
              <Input
                id={id}
                value={word}
                autoComplete="off"
                aria-describedby={describedBy}
                onChange={(e) => setWord(e.target.value)}
              />
            )}
          </Field>
        </div>
      </Modal>
    </div>
  );
}
