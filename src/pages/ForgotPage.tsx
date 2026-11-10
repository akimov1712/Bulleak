import { useState } from 'react';
import { Link } from 'react-router';
import { forgotBodySchema } from '@bulleak/shared';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { AuthCard, FormMessage } from '@/features/account/AuthCard';
import { useAuthForm } from '@/features/account/useAuthForm';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAuth } from '@/store/authStore';
import { paths } from '@/app/paths';

export function ForgotPage() {
  usePageTitle('Восстановление пароля');
  const api = useAuth((s) => s.api);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useAuthForm(forgotBodySchema, async ({ email }) => {
    if (!api) return;
    await api.forgot(email);
    setSentTo(email);
  });

  return (
    <AuthCard
      title="Восстановление пароля"
      subtitle="Пришлём на e-mail ссылку, по которой можно задать новый пароль."
      footer={
        <Link to={paths.login()} className="font-semibold text-info hover:underline">
          Вернуться ко входу
        </Link>
      }
    >
      {sentTo ? (
        // The same answer whether the account exists or not: the form does not reveal it.
        <p role="status">
          Если аккаунт с адресом <span className="font-semibold">{sentTo}</span> есть, мы отправили
          на него письмо. Ссылка действует 1 час. Проверь папку «Спам», если письма нет.
        </p>
      ) : (
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void form.submit({ email: new FormData(e.currentTarget).get('email') });
          }}
        >
          <FormMessage message={form.message} />
          <Field label="E-mail" error={form.fields.email}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>
          <Button type="submit" fullWidth loading={form.pending}>
            Отправить ссылку
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
