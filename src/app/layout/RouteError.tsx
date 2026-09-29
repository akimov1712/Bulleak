import { useState } from 'react';
import { useRouteError } from 'react-router';
import { Copy, Home, RefreshCw } from 'lucide-react';
import { Mascot } from '@/components/mascot/Mascot';
import { Button } from '@/components/ui/Button';
import { errorDetails, isStaleChunkError } from '@/lib/errors';

/**
 * App-wide error screen (root route `errorElement`): never a white screen. Progress lives in
 * the browser storage and is not affected; the learner can reload, go home or copy details.
 */
export function RouteError() {
  const error = useRouteError();
  const [copied, setCopied] = useState(false);
  const stale = isStaleChunkError(error);
  const copy = () => {
    const text = errorDetails(error, window.location.href, navigator.userAgent);
    void navigator.clipboard?.writeText(text).then(
      () => setCopied(true),
      () => undefined,
    );
  };
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 px-4 text-center"
    >
      <Mascot mood={stale ? 'thinking' : 'shocked'} size={130} />
      <h1 className="text-2xl font-extrabold">
        {stale ? 'Сайт обновился' : 'Что-то пошло не так'}
      </h1>
      <p className="text-text-muted">
        {stale
          ? 'Часть страницы относится к прошлой версии. Обнови страницу — прогресс сохранится.'
          : 'Страница не смогла открыться. Прогресс хранится в браузере и не пострадал — обнови страницу или вернись на главную.'}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          leftIcon={<RefreshCw className="size-5" aria-hidden="true" />}
          onClick={() => window.location.reload()}
        >
          Обновить страницу
        </Button>
        <Button
          variant="secondary"
          leftIcon={<Home className="size-5" aria-hidden="true" />}
          onClick={() => {
            window.location.hash = '#/';
            window.location.reload();
          }}
        >
          На главную
        </Button>
      </div>
      {!stale && (
        <Button
          variant="ghost"
          leftIcon={<Copy className="size-5" aria-hidden="true" />}
          onClick={copy}
        >
          {copied ? 'Детали скопированы' : 'Скопировать детали ошибки'}
        </Button>
      )}
    </main>
  );
}
