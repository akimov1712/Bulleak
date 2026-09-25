import { Link } from 'react-router';
import { Mascot } from '@/components/mascot/Mascot';
import { buttonClass } from '@/components/ui/styles';
import { usePageTitle } from '@/hooks/usePageTitle';
import { paths } from '@/app/paths';

export function NotFoundPage() {
  usePageTitle('Страница не найдена');
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <Mascot mood="shocked" size={180} />
      <p className="font-mono text-6xl font-extrabold text-bear">404</p>
      <h1 className="text-3xl font-extrabold">Такой страницы нет</h1>
      <p className="max-w-md text-lg text-text-muted">
        Похоже, цена ушла за пределы графика. Вернёмся к плану?
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link to={paths.home()} className={buttonClass()}>
          На главную
        </Link>
        <Link to={paths.path()} className={buttonClass({ variant: 'secondary' })}>
          Карта курса
        </Link>
      </div>
    </div>
  );
}
