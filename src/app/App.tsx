import { useApplyTheme, useResolvedTheme } from '@/hooks/useTheme';
import { useSettings } from '@/store/settingsStore';
import { Mascot } from '@/components/mascot/Mascot';
import { MOOD_LIST, MOODS } from '@/components/mascot/moods';

// Temporary start screen; replaced by the app shell in T-107/T-108.
export function App() {
  useApplyTheme();
  const theme = useResolvedTheme();
  const update = useSettings((s) => s.update);

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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {MOOD_LIST.map((mood) => (
          <figure key={mood} className="flex flex-col items-center gap-1">
            <Mascot mood={mood} size={120} />
            <figcaption className="text-sm text-text-muted">{MOODS[mood].label}</figcaption>
          </figure>
        ))}
      </div>
      <button
        type="button"
        onClick={() => update({ theme: theme === 'light' ? 'dark' : 'light' })}
        className="w-fit rounded-(--radius-btn) bg-primary px-6 py-3 text-lg font-extrabold text-on-primary shadow-[0_4px_0_0_var(--primary-shade)] transition active:translate-y-1 active:shadow-none"
      >
        {theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
      </button>
    </main>
  );
}
