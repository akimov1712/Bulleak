import { useEffect } from 'react';
import { useSettings } from '@/store/settingsStore';
import type { ResolvedTheme } from '@/types/settings';
import { useMediaQuery } from './useMediaQuery';

/** Theme actually in effect after resolving "system". */
export function useResolvedTheme(): ResolvedTheme {
  const theme = useSettings((s) => s.theme);
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  if (theme === 'system') return prefersDark ? 'dark' : 'light';
  return theme;
}

/** Writes the resolved theme to <html data-theme> and the browser theme-color. Mount once. */
export function useApplyTheme(): void {
  const resolved = useResolvedTheme();
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolved;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = resolved === 'dark' ? '#0f1220' : '#f7f8fc';
  }, [resolved]);
}
