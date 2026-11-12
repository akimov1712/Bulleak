import { Link, useNavigate, useSearchParams } from 'react-router';
import { isWeakPassword, PASSWORD_MIN, registerBodySchema } from '@bulleak/shared';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { AuthCard, FormMessage } from '@/features/account/AuthCard';
import { SignedInNotice } from '@/features/account/SignedInNotice';
import { safeNext } from '@/lib/auth/safeNext';
import { useAuthForm } from '@/features/account/useAuthForm';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAuth } from '@/store/authStore';
import { useProgress } from '@/store/progressStore';
import { toast } from '@/store/uiStore';
import { paths } from '@/app/paths';

const WEAK = 'Этот пароль слишком легко подобрать. Придумай другой.';

export function RegisterPage() {
  usePageTitle('Регистрация');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const api = useAuth((s) => s.api);
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  // The name the learner already gave in onboarding.
  const profileName = useProgress((s) => s.profile.name);
  const setProfileName = useProgress((s) => s.setName);
  const form = useAuthForm(
    registerBodySchema,
    async (body) => {
      if (!api) return;
      const created = await api.register(body);
      setUser(created);
      // The account name is the one to greet and print on the certificate.
      setProfileName(created.name);
      toast({
        tone: 'success',
        title: 'Аккаунт создан',
        description: `Мы отправили письмо для подтверждения на ${created.email}.`,
      });
      void navigate(safeNext(params.get('next')));
    },
    // Same check as the server, so the learner does not wait for a round trip.
    (body) => (isWeakPassword(body.password, body.email, body.name) ? { password: WEAK } : null),
  );

  return (
    <AuthCard
      title="Регистрация"
      subtitle="Аккаунт нужен, чтобы прогресс не терялся при смене браузера и устройства."
      footer={
        <>
          Уже есть аккаунт?{' '}
          <Link to={paths.login()} className="font-semibold text-info hover:underline">
            Войти
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
            void form.submit({
              name: data.get('name'),
              email: data.get('email'),
              password: data.get('password'),
            });
          }}
        >
          <FormMessage message={form.message} />
          <Field label="Как тебя зовут?" error={form.fields.name}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="name"
                autoComplete="given-name"
                defaultValue={profileName}
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>
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
          <Field
            label="Пароль"
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
            Создать аккаунт
          </Button>
          <p className="text-xs text-text-muted">
            Прогресс, сделки и журнал с этого устройства перенесутся в аккаунт. Пароль хранится
            только в виде хэша. Что и где хранится —{' '}
            <Link to={paths.privacy()} className="font-bold text-info hover:underline">
              политика конфиденциальности
            </Link>
            . Курс не даёт инвестиционных рекомендаций.
          </p>
        </form>
      )}
    </AuthCard>
  );
}
