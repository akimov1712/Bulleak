import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';
import { slugify, textOf } from '@/lib/slug';

/** Styled HTML elements for MDX lesson text. */

export function H2({ children, className, ...rest }: ComponentProps<'h2'>) {
  return (
    <h2
      id={slugify(textOf(children))}
      data-toc
      className={cn(
        'mt-12 mb-4 scroll-mt-24 text-2xl font-extrabold tracking-tight md:text-[1.75rem]',
        className,
      )}
      {...rest}
    >
      {children}
    </h2>
  );
}

export function H3({ children, className, ...rest }: ComponentProps<'h3'>) {
  return (
    <h3
      id={slugify(textOf(children))}
      className={cn('mt-8 mb-3 scroll-mt-24 text-xl font-extrabold', className)}
      {...rest}
    >
      {children}
    </h3>
  );
}

export function P({ className, ...rest }: ComponentProps<'p'>) {
  return <p className={cn('my-4 leading-[1.75]', className)} {...rest} />;
}

export function Ul({ className, ...rest }: ComponentProps<'ul'>) {
  return (
    <ul className={cn('my-4 list-disc space-y-2 pl-6 marker:text-primary', className)} {...rest} />
  );
}

export function Ol({ className, ...rest }: ComponentProps<'ol'>) {
  return (
    <ol
      className={cn(
        'my-4 list-decimal space-y-2 pl-6 marker:font-extrabold marker:text-primary',
        className,
      )}
      {...rest}
    />
  );
}

export function Li({ className, ...rest }: ComponentProps<'li'>) {
  return <li className={cn('pl-1 leading-[1.7]', className)} {...rest} />;
}

export function Strong({ className, ...rest }: ComponentProps<'strong'>) {
  return <strong className={cn('font-extrabold text-text', className)} {...rest} />;
}

export function A({ className, href, children, ...rest }: ComponentProps<'a'>) {
  const external = href?.startsWith('http');
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      className={cn(
        'font-bold text-info underline decoration-2 underline-offset-2 hover:decoration-info/40',
        className,
      )}
      {...rest}
    >
      {children}
    </a>
  );
}

export function Table({ className, ...rest }: ComponentProps<'table'>) {
  return (
    <div className="my-6 overflow-x-auto rounded-2xl border-2 border-border">
      <table
        className={cn('w-full border-collapse text-left text-[0.95rem]', className)}
        {...rest}
      />
    </div>
  );
}

export function Th({ className, ...rest }: ComponentProps<'th'>) {
  return (
    <th
      className={cn(
        'border-b-2 border-border bg-surface-2 px-4 py-2.5 font-extrabold whitespace-nowrap',
        className,
      )}
      {...rest}
    />
  );
}

export function Td({ className, ...rest }: ComponentProps<'td'>) {
  return <td className={cn('border-t border-border px-4 py-2.5 align-top', className)} {...rest} />;
}

export function Blockquote({ className, ...rest }: ComponentProps<'blockquote'>) {
  return (
    <blockquote
      className={cn(
        'my-6 border-l-4 border-epic pl-4 text-lg font-semibold text-text-muted italic',
        className,
      )}
      {...rest}
    />
  );
}

export function Code({ className, ...rest }: ComponentProps<'code'>) {
  return (
    <code
      className={cn(
        'rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[0.9em] text-text',
        className,
      )}
      {...rest}
    />
  );
}

export function Hr() {
  return <hr className="my-10 border-t-2 border-dashed border-border" />;
}
