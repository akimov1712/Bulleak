import type { AchievementDef } from '@/types/achievements';
import type { ProgressState } from '@/types/progress';
import { fromDateKey, addDays, isDateKey } from '@/lib/date';
import { levelFromXp } from '@/lib/gamification/levels';

/** All calculators (docs/04-features/calculators.md) — for «Считаю всё». */
export const CALCULATOR_IDS = [
  'position',
  'liquidation',
  'rr',
  'expectancy',
  'fees',
  'drawdown',
  'compounding',
] as const;

const completedCount = (s: ProgressState) =>
  Object.values(s.lessons).filter((l) => l?.completedAt !== undefined).length;

const passedModuleExams = (s: ProgressState) =>
  Object.entries(s.exams).filter(([key, e]) => key !== 'final' && e?.passedAt !== undefined);

const totalMinutes = (s: ProgressState) =>
  Object.values(s.activity).reduce((n, d) => n + (d?.minutes ?? 0), 0);

const hourOf = (ts: number) => new Date(ts).getHours();

const isLearningEvent = (type: string | undefined) =>
  type === 'lessonRead' ||
  type === 'lessonTime' ||
  type === 'quizCompleted' ||
  type === 'examCompleted';

/** Some Saturday and the following Sunday both have activity. */
function hasFullWeekend(s: ProgressState): boolean {
  return Object.entries(s.activity).some(([key, day]) => {
    if (!isDateKey(key) || !day || day.xp <= 0) return false;
    if (fromDateKey(key).getDay() !== 6) return false;
    return (s.activity[addDays(key, 1)]?.xp ?? 0) > 0;
  });
}

const count = (target: number, current: (s: ProgressState) => number) => ({
  check: (s: ProgressState) => current(s) >= target,
  progress: (s: ProgressState) => ({ current: Math.min(target, current(s)), target }),
});

/** Achievement definitions — docs/03-content/achievements-list.md (40). */
export const achievements: AchievementDef[] = [
  // ——— Обучение ———
  {
    id: 'first-step',
    title: 'Первый шаг',
    description: 'Прочитать первый урок',
    icon: '👣',
    category: 'learning',
    rarity: 'common',
    xp: 10,
    check: (s) => Object.values(s.lessons).some((l) => l?.readAt !== undefined),
  },
  {
    id: 'first-quiz',
    title: 'Проверено',
    description: 'Сдать первый тест',
    icon: '✅',
    category: 'learning',
    rarity: 'common',
    xp: 10,
    check: (s) => completedCount(s) >= 1,
  },
  {
    id: 'perfect-1',
    title: 'Отличник',
    description: 'Сдать тест на 100%',
    icon: '💯',
    category: 'learning',
    rarity: 'common',
    xp: 15,
    ...count(1, (s) => s.counters.perfectQuizzes),
  },
  {
    id: 'perfect-10',
    title: 'Перфекционист',
    description: '10 тестов на 100%',
    icon: '🎯',
    category: 'learning',
    rarity: 'rare',
    xp: 50,
    ...count(10, (s) => s.counters.perfectQuizzes),
  },
  {
    id: 'perfect-module',
    title: 'Без единой ошибки',
    description: 'Все тесты одного модуля на 100%',
    icon: '🏅',
    category: 'learning',
    rarity: 'epic',
    xp: 100,
    check: (s, { course }) =>
      course.modules.some(
        (m) =>
          m.lessons.length > 0 && m.lessons.every((l) => (s.lessons[l.id]?.quizBest ?? 0) >= 1),
      ),
  },
  {
    id: 'lessons-10',
    title: 'Разогрев',
    description: 'Пройти 10 уроков',
    icon: '🔥',
    category: 'learning',
    rarity: 'common',
    xp: 20,
    ...count(10, completedCount),
  },
  {
    id: 'lessons-30',
    title: 'Половина пути',
    description: 'Пройти 30 уроков',
    icon: '🧭',
    category: 'learning',
    rarity: 'rare',
    xp: 50,
    ...count(30, completedCount),
  },
  {
    id: 'lessons-all',
    title: 'Всё изучено',
    description: 'Пройти все уроки курса',
    icon: '📚',
    category: 'learning',
    rarity: 'epic',
    xp: 100,
    check: (s, { course }) => completedCount(s) >= course.lessons.length,
    progress: (s, { course }) => ({
      current: Math.min(course.lessons.length, completedCount(s)),
      target: course.lessons.length,
    }),
  },
  {
    id: 'module-1',
    title: 'Модуль закрыт',
    description: 'Сдать первый экзамен модуля',
    icon: '📦',
    category: 'learning',
    rarity: 'common',
    xp: 20,
    check: (s) => passedModuleExams(s).length >= 1,
  },
  {
    id: 'exam-perfect',
    title: 'Экзамен на отлично',
    description: 'Сдать экзамен модуля на 100%',
    icon: '🌟',
    category: 'learning',
    rarity: 'rare',
    xp: 50,
    check: (s) => passedModuleExams(s).some(([, e]) => (e?.best ?? 0) >= 1),
  },
  {
    id: 'chartist',
    title: 'Чартист',
    description: 'Сдать экзамен модуля «Чтение графика»',
    icon: '🕯️',
    category: 'learning',
    rarity: 'rare',
    xp: 30,
    check: (s) => s.exams.m03?.passedAt !== undefined,
  },
  {
    id: 'risk-manager',
    title: 'Риск-менеджер',
    description: 'Сдать экзамен модуля «Риск-менеджмент»',
    icon: '🛡️',
    category: 'learning',
    rarity: 'rare',
    xp: 50,
    check: (s) => s.exams.m09?.passedAt !== undefined,
  },
  {
    id: 'graduate',
    title: 'Выпускник',
    description: 'Сдать финальный экзамен',
    icon: '🎓',
    category: 'learning',
    rarity: 'legendary',
    xp: 200,
    check: (s) => s.exams.final?.passedAt !== undefined,
  },
  {
    id: 'comeback',
    title: 'Работа над ошибками',
    description: 'Сдать тест после неудачной попытки',
    icon: '💪',
    category: 'learning',
    rarity: 'common',
    xp: 15,
    check: (s, { event }) =>
      event?.type === 'quizCompleted' &&
      event.result.passed &&
      s.quizAttempts.some((a) => a.quizId === event.lessonId && !a.passed),
  },
  {
    id: 'fast-learner',
    title: 'Быстрый ум',
    description: 'Сдать тест на 100% быстрее чем за 3 минуты',
    icon: '⚡',
    category: 'learning',
    rarity: 'rare',
    xp: 30,
    check: (_s, { event }) =>
      event?.type === 'quizCompleted' &&
      event.result.ratio >= 1 &&
      event.durationSec !== undefined &&
      event.durationSec < 180,
  },

  // ——— Регулярность ———
  {
    id: 'streak-3',
    title: 'Искра',
    description: 'Заниматься 3 дня подряд',
    icon: '✨',
    category: 'habit',
    rarity: 'common',
    xp: 10,
    ...count(3, (s) => s.streak.longest),
  },
  {
    id: 'streak-7',
    title: 'Неделя огня',
    description: 'Заниматься 7 дней подряд',
    icon: '🔥',
    category: 'habit',
    rarity: 'common',
    xp: 20,
    ...count(7, (s) => s.streak.longest),
  },
  {
    id: 'streak-30',
    title: 'Месяц дисциплины',
    description: 'Заниматься 30 дней подряд',
    icon: '📅',
    category: 'habit',
    rarity: 'epic',
    xp: 100,
    ...count(30, (s) => s.streak.longest),
  },
  {
    id: 'streak-100',
    title: 'Железная воля',
    description: 'Заниматься 100 дней подряд',
    icon: '🏆',
    category: 'habit',
    rarity: 'legendary',
    xp: 200,
    ...count(100, (s) => s.streak.longest),
  },
  {
    id: 'goal-7',
    title: 'Целеустремлённый',
    description: 'Выполнить цель дня 7 раз',
    icon: '🎯',
    category: 'habit',
    rarity: 'rare',
    xp: 30,
    ...count(7, (s) => s.counters.dailyGoalsMet),
  },
  {
    id: 'hours-10',
    title: '10 часов',
    description: 'Провести за учёбой 10 часов',
    icon: '⏳',
    category: 'habit',
    rarity: 'rare',
    xp: 50,
    check: (s) => totalMinutes(s) >= 600,
    progress: (s) => ({ current: Math.min(10, Math.floor(totalMinutes(s) / 60)), target: 10 }),
  },
  {
    id: 'early-bird',
    title: 'Ранняя пташка',
    description: 'Заниматься до 7 утра',
    icon: '🌅',
    category: 'habit',
    rarity: 'common',
    xp: 15,
    secret: true,
    check: (_s, { event, now }) =>
      isLearningEvent(event?.type) && hourOf(now) >= 4 && hourOf(now) < 7,
  },
  {
    id: 'night-owl',
    title: 'Ночная сова',
    description: 'Заниматься после полуночи',
    icon: '🦉',
    category: 'habit',
    rarity: 'common',
    xp: 15,
    secret: true,
    check: (_s, { event, now }) => isLearningEvent(event?.type) && hourOf(now) < 4,
  },
  {
    id: 'weekend',
    title: 'Выходной трейдер',
    description: 'Заниматься и в субботу, и в воскресенье',
    icon: '🏖️',
    category: 'habit',
    rarity: 'common',
    xp: 15,
    secret: true,
    check: hasFullWeekend,
  },

  // ——— Практика ———
  {
    id: 'sim-first',
    title: 'Первая сделка',
    description: 'Завершить сделку в тренажёре',
    icon: '🕹️',
    category: 'practice',
    rarity: 'common',
    xp: 10,
    ...count(1, (s) => s.counters.simTrades),
  },
  {
    id: 'sim-10',
    title: 'Набиваю руку',
    description: '10 сделок в тренажёре',
    icon: '🎮',
    category: 'practice',
    rarity: 'common',
    xp: 20,
    ...count(10, (s) => s.counters.simTrades),
  },
  {
    id: 'sim-100',
    title: 'Сотня',
    description: '100 сделок в тренажёре',
    icon: '💯',
    category: 'practice',
    rarity: 'epic',
    xp: 100,
    ...count(100, (s) => s.counters.simTrades),
  },
  {
    id: 'sim-3r',
    title: 'Большая рыба',
    description: 'Сделка на +3R и больше в тренажёре',
    icon: '🐋',
    category: 'practice',
    rarity: 'rare',
    xp: 30,
    check: (_s, { event }) => event?.type === 'simTrade' && event.r >= 3,
  },
  {
    id: 'sim-skip',
    title: 'Терпение',
    description: '5 раз правильно не войти в сделку',
    icon: '🧘',
    category: 'practice',
    rarity: 'rare',
    xp: 30,
    secret: true,
    ...count(5, (s) => s.counters.simCorrectSkips),
  },
  {
    id: 'backtester',
    title: 'Бэктестер',
    description: '30 сделок в режиме бэктеста',
    icon: '🧪',
    category: 'practice',
    rarity: 'epic',
    xp: 100,
    ...count(30, (s) => s.counters.backtestTrades),
  },
  {
    id: 'positive-e',
    title: 'Есть преимущество',
    description: 'Положительное матожидание бэктеста на 30+ сделках',
    icon: '📈',
    category: 'practice',
    rarity: 'epic',
    xp: 75,
    check: (_s, { event }) =>
      event?.type === 'backtestEvaluated' && event.trades >= 30 && event.expectancyR > 0,
  },
  {
    id: 'calc-all',
    title: 'Считаю всё',
    description: 'Воспользоваться всеми калькуляторами',
    icon: '🧮',
    category: 'practice',
    rarity: 'common',
    xp: 20,
    ...count(
      CALCULATOR_IDS.length,
      (s) => CALCULATOR_IDS.filter((id) => s.counters.calculatorsUsed.includes(id)).length,
    ),
  },
  {
    id: 'journal-first',
    title: 'Летописец',
    description: 'Первая запись в журнале сделок',
    icon: '📝',
    category: 'practice',
    rarity: 'common',
    xp: 10,
    ...count(1, (s) => s.counters.journalEntries),
  },
  {
    id: 'journal-30',
    title: 'Форвард-тестер',
    description: '30 закрытых сделок на демо или тестнете',
    icon: '🧾',
    category: 'practice',
    rarity: 'epic',
    xp: 100,
    ...count(30, (s) => s.counters.forwardTrades),
  },
  {
    id: 'disciplined',
    title: 'По плану',
    description: '20 сделок подряд строго по плану',
    icon: '📐',
    category: 'practice',
    rarity: 'epic',
    xp: 75,
    ...count(20, (s) => s.counters.planStreak),
  },
  {
    id: 'plan-written',
    title: 'План на бумаге',
    description: 'Заполнить торговый план',
    icon: '🗺️',
    category: 'practice',
    rarity: 'rare',
    xp: 30,
    check: (s) => s.counters.planWritten,
  },

  // ——— Прочее ———
  {
    id: 'glossary-50',
    title: 'Словарный запас',
    description: 'Открыть 50 терминов глоссария',
    icon: '📖',
    category: 'other',
    rarity: 'common',
    xp: 20,
    ...count(50, (s) => s.counters.glossaryViewed.length),
  },
  {
    id: 'backup',
    title: 'Предусмотрительный',
    description: 'Сделать резервную копию прогресса',
    icon: '💾',
    category: 'other',
    rarity: 'common',
    xp: 10,
    check: (s) => s.profile.lastBackupAt !== undefined,
  },
  {
    id: 'level-10',
    title: 'Двузначный',
    description: 'Достичь 10 уровня',
    icon: '🔟',
    category: 'other',
    rarity: 'rare',
    xp: 50,
    ...count(10, (s) => levelFromXp(s.xp).level),
  },
  {
    id: 'level-20',
    title: 'Мастер рынка',
    description: 'Достичь 20 уровня',
    icon: '👑',
    category: 'other',
    rarity: 'legendary',
    xp: 150,
    ...count(20, (s) => levelFromXp(s.xp).level),
  },
];

export const achievementById = new Map(achievements.map((a) => [a.id, a]));
