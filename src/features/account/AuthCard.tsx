import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/cn';
import { buttonClass, cardClass } from '@/components/ui/styles';
import { paths } from '@/app/paths';
import { useAuth } from '@/store/authStore';

/** Frame of the sign-in pages: heading, form card and what to show without an API. */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const api = useAuth((s) => s.api);
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 py-4 md:py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {subtitle && <p className="text-text-muted">{subtitle}</p>}
      </div>
      <div className={cn(cardClass({ padding: 'lg' }), 'flex flex-col gap-4')}>
        {api ? (
          children
        ) : (
          <>
            <p>Аккаунты на этой версии сайта пока недоступны. Весь курс работает и без них.</p>
            <Link
              to={paths.home()}
              className={cn(buttonClass({ variant: 'secondary' }), 'self-start')}
            >
              На главную
            </Link>
          </>
        )}
      </div>
      {api && footer && <p className="text-center text-sm text-text-muted">{footer}</p>}
    </div>
  );
}

export function FormMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-(--radius-btn) bg-bear-soft px-3 py-2 text-sm font-medium text-bear"
    >
      {message}
    </p>
  );
}
