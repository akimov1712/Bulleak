import { useEffect } from 'react';
import { useLocation } from 'react-router';

/** Reset scroll on route change (lesson pages restore their own position later). */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}
