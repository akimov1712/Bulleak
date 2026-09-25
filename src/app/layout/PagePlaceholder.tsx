import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/ui/Skeleton';
import { Mascot, type MascotMood } from '@/components/mascot/Mascot';
import { buttonClass } from '@/components/ui/styles';
import { usePageTitle } from '@/hooks/usePageTitle';
import { paths } from '../paths';
import { PageHeader } from './PageHeader';

export interface PagePlaceholderProps {
  title: string;
  subtitle?: string;
  /** What will appear here and at which stage. */
  description: ReactNode;
  mood?: MascotMood;
}

/** Temporary page body for sections that are built in later stages. */
export function PagePlaceholder({
  title,
  subtitle,
  description,
  mood = 'thinking',
}: PagePlaceholderProps) {
  usePageTitle(title);
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <EmptyState
        art={<Mascot mood={mood} size={140} />}
        title="Скоро здесь будет много интересного"
        description={description}
        action={
          <Link to={paths.path()} className={buttonClass({ variant: 'secondary' })}>
            К карте курса
          </Link>
        }
      />
    </>
  );
}
