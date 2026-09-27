# Модель данных

Все типы живут в `src/types/`. Ниже — источник правды для реализации (синхронизировано с кодом 2026-09-25, T-201).

## Курс (`types/course.ts`)
```ts
type ModuleId = `m${string}`;          // "m00".."m12"
type LessonId = `${ModuleId}-l${string}`; // "m03-l02"

interface CourseModule {
  id: ModuleId;
  index: number;            // 0..12
  title: string;
  description: string;
  icon: string;             // имя иконки lucide
  color: ModuleColor;       // токен цвета модуля: 'green'|'blue'|'purple'|'orange'|'pink'|'teal'|'yellow'|'red'
  cover?: string;           // путь к обложке в public/img
  lessons: LessonMeta[];
  hasExam: boolean;         // модуль 0 — без экзамена
}

interface LessonMeta {
  id: LessonId;
  moduleId: ModuleId;
  index: number;            // порядковый номер в модуле, с 1
  title: string;
  summary: string;          // 1 предложение для карточки
  minutes: number;          // оценка времени
  terms: string[];          // id терминов глоссария, вводимых в уроке
  practice?: 'simulator' | 'calculator' | 'journal' | 'chart';
  scenarioIds?: string[];   // сценарии тренажёра урока
}
```

## Тест (`types/quiz.ts`)
```ts
type Question =
  | SingleQ | MultiQ | TrueFalseQ | NumericQ | ChartClickQ | MatchQ | OrderQ;

interface BaseQ { id: string; prompt: string; explanation: string; tags: string[]; image?: string; }
interface SingleQ   extends BaseQ { type: 'single'; options: Option[]; correct: string }       // id варианта
interface MultiQ    extends BaseQ { type: 'multi'; options: Option[]; correct: string[] }
interface TrueFalseQ extends BaseQ { type: 'truefalse'; correct: boolean }
interface NumericQ  extends BaseQ { type: 'numeric'; correct: number; tolerance: number; unit?: string } // |ответ-correct| <= tolerance
interface ChartClickQ extends BaseQ {
  type: 'chart-click';
  dataset: string;           // "BTCUSDT-240"
  from: number; to: number;  // индексы свечей, которые показываем
  target: { kind: 'price'; min: number; max: number }      // кликнуть по цене в диапазоне
        | { kind: 'candle'; indices: number[] };            // кликнуть по одной из свечей
}
interface MatchQ    extends BaseQ { type: 'match'; pairs: { left: string; right: string }[] }
interface OrderQ    extends BaseQ { type: 'order'; items: string[] }  // правильный порядок = порядок в массиве
interface Option { id: string; text: string }

interface Quiz { id: string; kind: 'lesson' | 'exam' | 'final'; questions: Question[]; passRatio: number; sample?: number }
// sample — сколько вопросов случайно брать (для экзаменов из пула)

type AnswerValue = string | string[] | boolean | number | { price: number } | { candle: number } | Record<string,string>;
interface QuizResult { quizId: string; correct: number; total: number; ratio: number; passed: boolean;
  perQuestion: { id: string; correct: boolean; tags: string[] }[] }
```

## Прогресс (`types/progress.ts`) — localStorage, ключ `tc-progress`
```ts
interface ProgressState {
  version: number;                                   // для миграций, сейчас 1
  lessons: Record<LessonId, LessonProgress>;
  exams: Record<ModuleId | 'final', ExamProgress>;
  xp: number;                                        // суммарный
  activity: Record<DateKey, DayActivity>;            // DateKey = 'YYYY-MM-DD' локальная дата
  streak: { current: number; longest: number; lastActiveDay: DateKey | null; freezes: number };
  achievements: Record<string, number>;              // id -> timestamp разблокировки
  quizAttempts: QuizAttempt[];                       // последние 500
  counters: Counters;                                // для достижений
  profile: { name: string; startedAt: number; lastBackupAt?: number };
}
interface LessonProgress { readAt?: number; quizBest: number; quizAttempts: number; completedAt?: number; timeSpentSec: number; xpEarned: number; improvements: number } // improvements — сколько раз пересдача улучшила результат (лимит XP)
interface ExamProgress   { best: number; attempts: number; passedAt?: number; lastAttemptAt?: number } // lastAttemptAt — для паузы перед пересдачей
interface DayActivity    { xp: number; minutes: number; lessonsCompleted: number; quizzes: number; simTrades: number; simXp: number; journalXp: number; goalMet: boolean } // simXp/journalXp — для дневных лимитов XP
interface QuizAttempt    { quizId: string; at: number; ratio: number; passed: boolean; tags: Record<string, [number, number]>; durationSec?: number } // тег → [верно, всего]
interface Counters { perfectQuizzes: number; simTrades: number; simWins: number; journalEntries: number; calculatorsUsed: string[]; glossaryViewed: string[]; dailyGoalsMet: number; simSkippedScenarios: string[]; backtestTrades: number; forwardTrades: number; planStreak: number; planWritten: boolean } // glossaryViewed, simSkippedScenarios — уникальные id (v2)
```
Статус урока вычисляется, не хранится: `locked | available | read | completed` — `lib/progress/unlock.ts`.

## События прогресса (`types/events.ts`)
Все действия ученика — `ProgressEvent` (lessonRead, quizCompleted, examCompleted, simTrade, simSkip, backtestEvaluated, journalEntry, calculatorUsed, glossaryViewed, backupMade, planSaved, lessonTime). Единый конвейер `lib/progress/applyEvent.ts` превращает событие в новое состояние + `Rewards` (XP с причинами, новые достижения, level up, цель дня, стрик).

## Настройки — localStorage, ключ `tc-settings`
```ts
interface Settings { theme: 'light'|'dark'|'system'; sound: boolean; dailyGoalXp: 20|50|100|150; freeMode: boolean; reducedMotion: 'system'|'on'|'off' }
```

## Торговля (`types/trading.ts`) — IndexedDB (Dexie), БД `tc-db`
```ts
type Side = 'long' | 'short';
interface Candle { t: number; o: number; h: number; l: number; c: number; v: number }   // t — ms UTC

interface SimTrade {
  id?: number; at: number; scenarioId: string | null; strategyTag?: string; dataset: string; startIndex: number;
  side: Side; entry: number; sl: number; tp: number; riskPct: number; balanceBefore: number;
  qty: number; exitPrice: number; exitIndex: number; outcome: 'tp'|'sl'|'timeout'|'manual';
  pnl: number; r: number; fees: number; notes?: string;
}

interface JournalTrade {
  id?: number; openedAt: number; closedAt?: number;
  account: 'demo'|'testnet'|'real'; symbol: string; side: Side; market: 'spot'|'perp';
  entry: number; exit?: number; sl: number; tp?: number; qty: number; leverage: number; fees: number;
  pnl?: number; r?: number;                 // вычисляется при закрытии
  setup: string;                            // название сетапа стратегии
  timeframe: '1H'|'4H'|'1D'|'other';
  followedPlan: boolean; emotion: 'calm'|'fear'|'greed'|'fomo'|'revenge'|'bored';
  notes: string; tags: string[];
}
```

## Экспорт (`lib/io/exportSchema.ts`)
```ts
interface ExportFile { app: 'trading-course'; schema: 1; exportedAt: number; progressVersion: number; progress: ProgressState; settings: Settings; simTrades: SimTrade[]; journal: JournalTrade[]; simBalance?: number }
```
Проверяется вручную в `lib/io/backup.ts` (без zod); прогресс проходит `migrateProgress()` до текущей версии, повреждённые записи сделок пропускаются.
