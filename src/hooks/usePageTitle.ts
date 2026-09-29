import { useEffect } from 'react';
import { BRAND } from '@/app/brand';

const APP_NAME = BRAND.name;

/** Sets document.title as "<page> · <app>". */
export function usePageTitle(title: string | null | undefined): void {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
  }, [title]);
}
