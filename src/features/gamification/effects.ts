import confetti from 'canvas-confetti';

/**
 * Side-effect helpers for celebrations (DOM / audio). Callers pass `enabled` flags
 * resolved from settings (reduced motion, sound) so these stay dumb.
 */

export type ConfettiSize = 'small' | 'medium' | 'big';

const COLORS = ['#16c26a', '#ffb020', '#3b82f6', '#a07af8', '#ec4899'];

export function fireConfetti(size: ConfettiSize, enabled: boolean): void {
  if (!enabled || typeof window === 'undefined') return;
  const particleCount = size === 'big' ? 160 : size === 'medium' ? 90 : 45;
  try {
    void confetti({
      particleCount,
      spread: size === 'big' ? 100 : 70,
      origin: { y: 0.65 },
      colors: COLORS,
      disableForReducedMotion: true,
    });
    if (size === 'big') {
      window.setTimeout(() => {
        void confetti({
          particleCount: 60,
          angle: 60,
          spread: 60,
          origin: { x: 0 },
          colors: COLORS,
        });
        void confetti({
          particleCount: 60,
          angle: 120,
          spread: 60,
          origin: { x: 1 },
          colors: COLORS,
        });
      }, 250);
    }
  } catch {
    // canvas unavailable (tests, old browsers): celebrations are optional
  }
}

export type SoundName = 'correct' | 'wrong' | 'levelUp' | 'achievement';

const MELODIES: Record<SoundName, [number, number][]> = {
  // [frequency Hz, duration s]
  correct: [
    [660, 0.08],
    [880, 0.12],
  ],
  wrong: [
    [300, 0.12],
    [220, 0.16],
  ],
  achievement: [
    [660, 0.08],
    [880, 0.08],
    [1175, 0.16],
  ],
  levelUp: [
    [523, 0.1],
    [659, 0.1],
    [784, 0.1],
    [1047, 0.24],
  ],
};

let audio: AudioContext | null = null;

/** Short generated tones via WebAudio (no audio files). Silently does nothing if unsupported. */
export function playSound(name: SoundName, enabled: boolean): void {
  if (!enabled || typeof window === 'undefined' || typeof AudioContext === 'undefined') return;
  try {
    audio ??= new AudioContext();
    let t = audio.currentTime;
    for (const [freq, dur] of MELODIES[name]) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain).connect(audio.destination);
      osc.start(t);
      osc.stop(t + dur);
      t += dur * 0.9;
    }
  } catch {
    // audio blocked or unavailable
  }
}
