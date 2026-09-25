import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { cardClass, type CardPadding } from './styles';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds hover/press feedback. Use for cards wrapped in links or buttons. */
  interactive?: boolean;
  padding?: CardPadding;
}

export function Card({ interactive, padding, className, ...rest }: CardProps) {
  return <div className={cn(cardClass({ interactive, padding }), className)} {...rest} />;
}
