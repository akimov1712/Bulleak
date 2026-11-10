import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { isWeakPassword, PASSWORD_MIN, resetBodySchema } from '@bulleak/shared';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { buttonClass } from '@/components/ui/styles';
import { AuthCard, FormMessage } from '@/features/account/AuthCard';
import { useAuthForm } from '@/features/account/useAuthForm';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAuth } from '@/store/authStore';
import { paths } from '@/app/paths';

const WEAK = 'Этот пароль слишком легко подобрать. Придумай другой.';

export function ResetPage() {
  usePageTitle('Новый пароль');
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const api = useAuth((s) => s.api);
  const [done, setDone] = useState(false);
  const form = useAuthForm(
    resetBodySchema,
    async (body) => {
      if (!api) return;
      await api.resetPassword(body.token, body.password);
      // The server ended every session of that account. If this device was signed in to it,
      // the check signs it out; a different account stays signed in.
      if (api.storedUser()) await api.checkSession().catch(() => undefined);
      setDone(true);
    },
    (body) => (isWeakPassword(body.password) ? { password: WEAK } : null),
  );
  const linkBroken = form.fields.token !== undefined || (!token && !done);

  return (
    <AuthCard title="Новый пароль" subtitle="Задай новый пароль для аккаунта.">
      {done ? (
        <>
          <p role="status">
            Пароль изменён. На всех устройствах нужно войти заново, уже с новым паролем.
          </p>
          <Link to={paths.login()} className={buttonClass({ fullWidth: true })}>
            Войти
          </Link>
        </>
      ) : linkBroken ? (
        <>
          <p role="alert">Ссылка неполная или устарела. Запроси новую — это займёт минуту.</p>
          <Link to={paths.forgot()} className={buttonClass({ variant: 'secondary' })}>
            Запросить новую ссылку
          </Link>
        </>
      ) : (
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void form.submit({ token, password: new FormData(e.currentTarget).get('password') });
          }}
        >
          <FormMessage message={form.message} />
          {form.code === 'token_invalid' && (
            <Link to={paths.forgot()} className="text-sm font-semibold text-info hover:underline">
              Запросить новую ссылку
            </Link>
          )}
          <Field
            label="Новый пароль"
            hint={`Не короче ${PASSWORD_MIN} символов. Лучше фраза из нескольких слов.`}
            error={form.fields.password}
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="password"
                type="password"
                autoComplete="new-password"
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>
          <Button type="submit" fullWidth loading={form.pending}>
            Сохранить пароль
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
