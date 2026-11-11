import { useEffect, useState } from 'react';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TOURS } from '@/content/tours';
import { useSettings } from '@/store/settingsStore';
import type { TourId } from '@/types/settings';

const HIGHLIGHT = ['ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-bg'];

/**
 * A short inline tour at the top of a page (not an overlay: it never blocks the page). Shown
 * until finished or skipped; restarted from the settings.
 */
export function Tour({ id }: { id: TourId }) {
  const seen = useSettings((s) => s.toursSeen.includes(id) || s.hints !== 'all');
  const update = useSettings((s) => s.update);
  const [step, setStep] = useState(0);
  const steps = TOURS[id];
  const current = steps[step];
  const target = seen ? undefined : current?.target;

  // Highlight the step's element, if it is on screen in this layout.
  useEffect(() => {
    if (!target) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
    // Hidden in this layout (e.g. desktop tabs on a phone): nothing to highlight.
    if (!el || (typeof el.checkVisibility === 'function' && !el.checkVisibility())) return;
    el.classList.add(...HIGHLIGHT);
    el.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    return () => el.classList.remove(...HIGHLIGHT);
  }, [target]);

  if (seen || !current) return null;
  const finish = () => update({ toursSeen: [...useSettings.getState().toursSeen, id] });
  const last = step === steps.length - 1;
  return (
    <Card className="flex flex-col gap-2 print:hidden" aria-label="Знакомство" role="region">
      <p className="flex items-center gap-2 text-sm font-bold text-text-muted">
        <Compass className="size-4" aria-hidden="true" />
        Знакомство · {step + 1} из {steps.length}
      </p>
      <h2 className="font-semibold">{current.title}</h2>
      <p>{current.text}</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={last ? finish : () => setStep(step + 1)}>
          {last ? 'Понятно' : 'Дальше'}
        </Button>
        {!last && (
          <Button size="sm" variant="ghost" onClick={finish}>
            Пропустить знакомство
          </Button>
        )}
      </div>
    </Card>
  );
}
