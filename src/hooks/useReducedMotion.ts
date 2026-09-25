import { useEffect } from 'react';
import { useSettings } from '@/store/settingsStore';
import { useMediaQuery } from './useMediaQuery';

/** True when animations should be minimized (user setting wins over the OS preference). */
export function useReducedMotion(): boolean {
  const setting = useSettings((s) => s.reducedMotion);
  const osPrefersReduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  if (setting === 'on') return false;
  if (setting === 'off') return true;
  return osPrefersReduced;
}

/**
 * Mirrors the resolved motion preference to <html data-motion> so CSS animations
 * (keyframes, transitions) obey the same setting as JS animations. Mount once.
 */
export function useApplyMotion(): void {
  const reduced = useReducedMotion();
  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? 'reduce' : 'full';
  }, [reduced]);
}
