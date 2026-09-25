import { Outlet } from 'react-router';
import { useApplyTheme } from '@/hooks/useTheme';
import { ScrollToTop } from './ScrollToTop';

/** Top-level layout: theme, scroll reset and page container. The full shell arrives in T-108. */
export function RootLayout() {
  useApplyTheme();
  return (
    <>
      <ScrollToTop />
      <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
        <Outlet />
      </main>
    </>
  );
}
