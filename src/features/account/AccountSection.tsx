import { useState } from 'react';
import { Link } from 'react-router';
import { CheckCircle2, LogOut, MailWarning, MonitorSmartphone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { buttonClass } from '@/components/ui/styles';
import { paths } from '@/app/paths';
import { useAuth } from '@/store/authStore';
import { toast } from '@/store/uiStore';

const errorText = (error: unknown) => (error instanceof Error ? error.message : undefined);

/** Settings → «Аккаунт»: sign-in for a guest, account details and sign-out for a user. */
export function AccountSection() {
  const api = useAuth((s) => s.api);
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const [confirmAll, setConfirmAll] = useState(false);
  const [pending, setPending] = useState(false);
  if (!api) return null;

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Аккаунт</h2>
      {!user ? (
        <>
          <p className="text-text-muted">
            Сейчас прогресс хранится только в этом браузере. Аккаунт нужен, чтобы он не терялся.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to={paths.login()} className={buttonClass()}>
              Войти
            </Link>
            <Link to={paths.register()} className={buttonClass({ variant: 'secondary' })}>
              Создать аккаунт
            </Link>
          </div>
        </>
      ) : (
        <>
          <dl className="grid gap-3 text-sm sm:grid-cols-[8rem_1fr]">
            <dt className="text-text-muted">Имя</dt>
            <dd className="font-medium">{user.name}</dd>
            <dt className="text-text-muted">E-mail</dt>
            <dd className="flex flex-col gap-1">
              <span className="font-medium break-all">{user.email}</span>
              {user.emailVerified ? (
                <span className="flex items-center gap-1.5 text-bull">
                  <CheckCircle2 className="size-4" aria-hidden="true" /> Подтверждён
                </span>
              ) : (
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-warn">
                  <span className="flex items-center gap-1.5">
                    <MailWarning className="size-4" aria-hidden="true" /> Не подтверждён
                  </span>
                  <button
                    type="button"
                    className="font-semibold text-info hover:underline"
                    onClick={() => {
                      api.resendVerification().then(
                        () =>
                          toast({
                            tone: 'info',
                            title: 'Письмо отправлено',
                            description: user.email,
                          }),
                        (error: unknown) =>
                          toast({
                            tone: 'error',
                            title: 'Не удалось отправить письмо',
                            description: errorText(error),
                          }),
                      );
                    }}
                  >
                    Отправить письмо ещё раз
                  </button>
                </span>
              )}
            </dd>
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              leftIcon={<LogOut className="size-4" aria-hidden="true" />}
              onClick={() => {
                setUser(null);
                void api.logout();
                toast({ tone: 'info', title: 'Ты вышел из аккаунта' });
              }}
            >
              Выйти
            </Button>
            <Button
              variant="ghost"
              leftIcon={<MonitorSmartphone className="size-4" aria-hidden="true" />}
              onClick={() => setConfirmAll(true)}
            >
              Выйти на всех устройствах
            </Button>
          </div>
          <p className="text-xs text-text-muted">
            Прогресс на этом устройстве останется и после выхода.
          </p>
        </>
      )}

      <Modal
        open={confirmAll}
        onClose={() => setConfirmAll(false)}
        title="Выйти на всех устройствах?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmAll(false)}>
              Отмена
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() => {
                setPending(true);
                api.logoutAll().then(
                  () => {
                    setPending(false);
                    setConfirmAll(false);
                    setUser(null);
                    toast({ tone: 'info', title: 'Ты вышел на всех устройствах' });
                  },
                  (error: unknown) => {
                    setPending(false);
                    toast({ tone: 'error', title: 'Не получилось', description: errorText(error) });
                  },
                );
              }}
            >
              Выйти везде
            </Button>
          </>
        }
      >
        <p>
          Аккаунт закроется на телефоне, компьютере и в других браузерах. Пригодится, если ты входил
          с чужого устройства.
        </p>
      </Modal>
    </Card>
  );
}
