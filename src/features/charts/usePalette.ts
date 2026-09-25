import { useMemo, useSyncExternalStore } from 'react';
import { readPalette, type Palette } from './annotations';

/*
 * Follows <html data-theme> directly (not the settings store): the attribute is
 * written in a parent effect, which runs after child effects, so reading CSS
 * variables on a settings change would still see the old theme.
 */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

const getTheme = () => document.documentElement.dataset.theme ?? 'light';

export function usePalette(): Palette {
  const theme = useSyncExternalStore(subscribe, getTheme, () => 'light');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- theme is the cache key for the CSS read
  return useMemo(() => readPalette(), [theme]);
}
