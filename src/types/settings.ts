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
}
