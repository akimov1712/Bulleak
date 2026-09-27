import type { JournalAccount, JournalEmotion, JournalTimeframe } from '@/types/trading';

export const ACCOUNT_LABEL: Record<JournalAccount, string> = {
  demo: 'Демо',
  testnet: 'Тестнет',
  real: 'Реальный',
};

export const EMOTION_LABEL: Record<JournalEmotion, string> = {
  calm: 'Спокойствие',
  fear: 'Страх',
  greed: 'Жадность',
  fomo: 'FOMO',
  revenge: 'Отыграться',
  bored: 'Скука',
};

export const TIMEFRAME_LABEL: Record<JournalTimeframe, string> = {
  '1H': '1H',
  '4H': '4H',
  '1D': '1D',
  other: 'Другой',
};

export const ACCOUNTS = Object.keys(ACCOUNT_LABEL) as JournalAccount[];
export const EMOTIONS = Object.keys(EMOTION_LABEL) as JournalEmotion[];
export const TIMEFRAMES = Object.keys(TIMEFRAME_LABEL) as JournalTimeframe[];
