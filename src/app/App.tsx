import { useState } from 'react';

type Theme = 'light' | 'dark';

// Temporary start screen for stage 00; replaced by the app shell in stage 01.
export function App() {
  const [theme, setTheme] = useState<Theme>('light');

  function toggleTheme() {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    setTheme(next);
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <h1 className="text-4xl font-extrabold">Трейдинг на Bybit с нуля</h1>
      <p className="text-lg text-text-muted">
        Интерактивный курс: от первой свечи до своей свинг-стратегии.
      </p>
      <div className="flex flex-wrap gap-3 font-mono tabular-nums">
        <span className="rounded-full bg-bull-soft px-3 py-1 font-bold text-bull">+2.40R</span>
        <span className="rounded-full bg-bear-soft px-3 py-1 font-bold text-bear">−1.00R</span>
        <span className="rounded-full bg-xp px-3 py-1 font-bold text-on-xp">+50 XP</span>
      </div>
      <button
        type="button"
        onClick={toggleTheme}
        className="w-fit rounded-(--radius-btn) bg-primary px-6 py-3 text-lg font-extrabold text-on-primary shadow-[0_4px_0_0_var(--primary-shade)] transition active:translate-y-1 active:shadow-none"
      >
        {theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
      </button>
    </main>
  );
}
