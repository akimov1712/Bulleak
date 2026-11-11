export type ThemeSetting = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';
/** Animations: follow the OS, always on, or minimal ('off'). */
export type MotionSetting = 'system' | 'on' | 'off';
export type DailyGoalXp = 20 | 50 | 100 | 150;

export interface Settings {
  theme: ThemeSetting;
  sound: boolean;
  dailyGoalXp: DailyGoalXp;
  /** Unlock every lesson regardless of progress. */
  freeMode: boolean;
  reducedMotion: MotionSetting;
  /** all — everything; less — no tours or tips; off — no hint ladder either (hints.md, section 8). */
  hints: HintSetting;
  /** First-visit tours already shown (hints.md, section 5). */
  toursSeen: TourId[];
}

export type TourId = 'home' | 'simulator';
export type HintSetting = 'all' | 'less' | 'off';
