import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ApiError } from '@/api/client';
import { Spinner } from '@/components/ui/Spinner';
import { buttonClass } from '@/components/ui/styles';
import { AuthCard } from '@/features/account/AuthCard';
import { createPromiseCache } from '@/lib/promiseCache';
import { usePageTitle } from '@/hooks/usePageTitle';
import { revalidateSession, useAuth } from '@/store/authStore';
import { paths } from '@/app/paths';

/** One request per link: a second call (React re-running effects) would find it already used. */
const verifications = createPromiseCache<string, true>();

type Status = 'pending' | 'done' | 'failed' | 'network';

export function VerifyPage() {
  usePageTitle('Подтверждение e-mail');
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const api = useAuth((s) => s.api);
  const signedIn = useAuth((s) => s.user !== null);
  const [status, setStatus] = useState<Status>('pending');

  useEffect(() => {
    if (!api || !token) return;
    let alive = true;
    verifications
      .get(token, () => api.verifyEmail(token).then(() => true as const))
      .then(
        () => {
          if (!alive) return;
          setStatus('done');
          revalidateSession();
        },
        (error: unknown) => {
          // A network failure may be retried with the same link; a used link may not.
          if (error instanceof ApiError && error.code === 'network') verifications.forget(token);
          if (alive)
            setStatus(error instanceof ApiError && error.code === 'network' ? 'network' : 'failed');
        },
      );
    return () => {
      alive = false;
    };
  }, [api, token]);

  const shown: Status = token ? status : 'failed';

  return (
    <AuthCard title="Подтверждение e-mail">
      {shown === 'pending' && (
        <p className="flex items-center gap-3" role="status">
          <Spinner className="size-5" /> Проверяем ссылку…
        </p>
      )}
      {shown === 'done' && (
        <>
          <p role="status">E-mail подтверждён. Спасибо!</p>
          <Link to={paths.home()} className={buttonClass({ variant: 'secondary' })}>
            На главную
          </Link>
        </>
      )}
      {shown === 'failed' && (
        <p role="alert">
          Ссылка недействительна или устарела.{' '}
          {signedIn
            ? 'Новое письмо можно отправить из меню профиля.'
            : 'Войди в аккаунт — в меню профиля появится кнопка «Отправить письмо ещё раз».'}
        </p>
      )}
      {shown === 'network' && (
        <p role="alert">Нет связи с сервером. Обнови страницу, когда появится интернет.</p>
      )}
    </AuthCard>
  );
}
