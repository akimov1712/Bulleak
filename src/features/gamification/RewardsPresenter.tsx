import { useEffect, useState } from 'react';
import type { Rewards } from '@/types/events';
import { achievementById } from '@/content/achievements';
import { rankForLevel } from '@/lib/gamification/levels';
import { useUi } from '@/store/uiStore';
import { useSettings } from '@/store/settingsStore';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Mascot } from '@/components/mascot/Mascot';
import { fireConfetti, playSound } from './effects';

const RARITY_LABEL = {
  common: 'Обычное',
  rare: 'Редкое',
  epic: 'Эпическое',
  legendary: 'Легендарное',
} as const;

/**
 * Consumes the rewards queue (filled by progressStore.dispatch) and celebrates:
 * achievement toasts, daily-goal toast, level-up modal with confetti and sounds.
 * Mount once in the app shell.
 */
export function RewardsPresenter() {
  const [levelUp, setLevelUp] = useState<{ from: number; to: number } | null>(null);
  const reduced = useReducedMotion();
  const sound = useSettings((s) => s.sound);

  useEffect(() => {
    const present = (rewards: Rewards) => {
      const { showToast } = useUi.getState();
      for (const id of rewards.newAchievements) {
        const def = achievementById.get(id);
        if (!def) continue;
        showToast({
          tone: 'achievement',
          icon: def.icon,
          title: `Достижение: ${def.title}`,
          description: `${def.description} · ${RARITY_LABEL[def.rarity]} · +${def.xp} XP`,
          durationMs: 6000,
        });
      }
      if (rewards.newAchievements.length > 0) playSound('achievement', sound);
      if (rewards.dailyGoalMet) {
        showToast({
          tone: 'xp',
          icon: '🎯',
          title: 'Цель дня выполнена!',
          description: '+20 XP бонус',
        });
      }
      if (rewards.levelUp) {
        setLevelUp(rewards.levelUp);
        playSound('levelUp', sound);
        fireConfetti('big', !reduced);
      }
    };
    const drain = () => {
      let next = useUi.getState().shiftRewards();
      while (next) {
        present(next);
        next = useUi.getState().shiftRewards();
      }
    };
    drain();
    return useUi.subscribe((state, prev) => {
      if (state.rewardsQueue.length > 0 && state.rewardsQueue !== prev.rewardsQueue) drain();
    });
  }, [reduced, sound]);

  if (!levelUp) return null;
  const rank = rankForLevel(levelUp.to);
  const newRank = rank !== rankForLevel(levelUp.from);
  return (
    <Modal open onClose={() => setLevelUp(null)} title="Новый уровень!" hideTitle size="sm">
      <div className="flex flex-col items-center gap-3 pb-2 text-center">
        <Mascot mood="cheering" size={150} />
        <p className="text-sm font-extrabold tracking-wide text-epic uppercase">Новый уровень!</p>
        <p className="font-mono text-6xl font-extrabold text-epic">{levelUp.to}</p>
        <p className="text-lg">
          {newRank ? (
            <>
              Новое звание: <span className="font-extrabold">{rank}</span>
            </>
          ) : (
            <>
              Звание: <span className="font-extrabold">{rank}</span>
            </>
          )}
        </p>
        <Button size="lg" fullWidth onClick={() => setLevelUp(null)}>
          Продолжить
        </Button>
      </div>
    </Modal>
  );
}
