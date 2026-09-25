import { useEffect, useState, type RefObject } from 'react';

/** Thin sticky bar showing how far the article has been scrolled. */
export function ReadingProgress({ target }: { target: RefObject<HTMLElement | null> }) {
  const [ratio, setRatio] = useState(0);

  useEffect(() => {
    let frame = 0;
    function update() {
      frame = 0;
      const el = target.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const passed = -rect.top;
      setRatio(total <= 0 ? 1 : Math.min(1, Math.max(0, passed / total)));
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [target]);

  return (
    <div
      className="sticky top-16 z-20 -mx-4 h-1.5 bg-surface-2 md:-mx-8"
      role="progressbar"
      aria-label="Прочитано"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
    >
      <div
        className="h-full bg-primary transition-[width] duration-150"
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}
