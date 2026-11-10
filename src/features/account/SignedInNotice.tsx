import { Link } from 'react-router';
import { cn } from '@/lib/cn';
import { buttonClass } from '@/components/ui/styles';
import { paths } from '@/app/paths';

export function SignedInNotice({ name }: { name: string }) {
  return (
    <>
      <p>
        Ты уже вошёл как <span className="font-semibold">{name}</span>.
      </p>
      <Link to={paths.home()} className={cn(buttonClass({ variant: 'secondary' }), 'self-start')}>
        На главную
      </Link>
    </>
  );
}
