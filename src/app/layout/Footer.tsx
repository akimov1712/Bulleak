import { Link } from 'react-router';
import { paths } from '../paths';

export function Footer() {
  return (
    <footer className="mx-auto w-full max-w-5xl px-4 pt-4 pb-8 text-xs text-text-muted md:px-8">
      <p className="border-t-2 border-border pt-4">
        Материалы носят образовательный характер и не являются инвестиционной рекомендацией.
        Торговля криптовалютой связана с высоким риском потери средств.{' '}
        <Link to={paths.about()} className="font-bold text-info underline-offset-2 hover:underline">
          О курсе
        </Link>
      </p>
    </footer>
  );
}
