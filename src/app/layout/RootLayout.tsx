import { Outlet } from 'react-router';
import { useApplyTheme } from '@/hooks/useTheme';
import { useApplyMotion } from '@/hooks/useReducedMotion';
import { Toaster } from '@/components/ui/Toaster';
import { ScrollToTop } from './ScrollToTop';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { Footer } from './Footer';

/** App shell: sidebar on desktop, top bar + bottom nav on mobile. */
export function RootLayout() {
  useApplyTheme();
  useApplyMotion();
  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-xl bg-surface px-4 py-2 font-bold focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Перейти к содержимому
      </a>
      <ScrollToTop />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-8 outline-none md:px-8 md:pt-8"
        >
          <Outlet />
        </main>
        <Footer />
        {/* space for the fixed bottom nav on mobile */}
        <div
          className="h-[calc(4.5rem+env(safe-area-inset-bottom))] lg:hidden"
          aria-hidden="true"
        />
      </div>
      <BottomNav />
      <Toaster />
    </div>
  );
}
