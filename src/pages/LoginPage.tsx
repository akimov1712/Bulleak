import { Link, useNavigate, useSearchParams } from 'react-router';
import { loginBodySchema } from '@bulleak/shared';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { AuthCard, FormMessage } from '@/features/account/AuthCard';
import { SignedInNotice } from '@/features/account/SignedInNotice';
import { safeNext } from '@/lib/auth/safeNext';
import { useAuthForm } from '@/features/account/useAuthForm';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAuth } from '@/store/authStore';
import { toast } from '@/store/uiStore';
import { paths } from '@/app/paths';

export function LoginPage() {
  usePageTitle('Вход');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const api = useAuth((s) => s.api);
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const form = useAuthForm(loginBodySchema, async (body) => {
    if (!api) return;
    const signedIn = await api.login(body);
    setUser(signedIn);
    toast({ tone: 'success', title: `С возвращением, ${signedIn.name}!` });
    void navigate(safeNext(params.get('next')));
  });

  return (
    <AuthCard
      title="Вход"
      subtitle="Войди в аккаунт Bulleak."
      footer={
        <>
          Нет аккаунта?{' '}
          <Link to={paths.register()} className="font-semibold text-info hover:underline">
            Зарегистрироваться
          </Link>
        </>
      }
    >
      {user ? (
        <SignedInNotice name={user.name} />
      ) : (
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            void form.submit({ email: data.get('email'), password: data.get('password') });
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
          <Field label="Пароль" error={form.fields.password}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="password"
                type="password"
                autoComplete="current-password"
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>
          <Button type="submit" fullWidth loading={form.pending}>
            Войти
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
