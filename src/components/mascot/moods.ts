export type MascotMood =
  'happy' | 'thinking' | 'cheering' | 'sad' | 'sleeping' | 'pointing' | 'shocked';

export interface MoodDef {
  label: string;
  arms: 'down' | 'up' | 'point' | 'chin';
}

export const MOODS: Record<MascotMood, MoodDef> = {
  happy: { label: 'Буллик улыбается', arms: 'down' },
  thinking: { label: 'Буллик задумался', arms: 'chin' },
  cheering: { label: 'Буллик празднует', arms: 'up' },
  sad: { label: 'Буллик грустит', arms: 'down' },
  sleeping: { label: 'Буллик спит', arms: 'down' },
  pointing: { label: 'Буллик показывает', arms: 'point' },
  shocked: { label: 'Буллик в шоке', arms: 'up' },
};

export const MOOD_LIST = Object.keys(MOODS) as MascotMood[];
