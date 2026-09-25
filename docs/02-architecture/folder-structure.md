# Структура репозитория

```
TradingLearning/
├─ CLAUDE.md
├─ docs/                         ТЗ (этот каталог)
├─ public/
│  ├─ data/                      свечи Bybit: BTCUSDT-240.json и т.д. (генерируются скриптом, коммитятся)
│  ├─ img/                       фото и картинки: img/covers/..., img/m02/...
│  └─ favicon.svg
├─ scripts/
│  └─ fetch-klines.ts            загрузка свечей с Bybit API
├─ e2e/                          Playwright-тесты
├─ src/
│  ├─ main.tsx                   вход, провайдеры
│  ├─ app/
│  │  ├─ App.tsx                 роутер
│  │  ├─ routes.tsx              таблица маршрутов (lazy)
│  │  └─ layout/                 AppShell, Sidebar, BottomNav, TopBar
│  ├─ pages/                     по файлу на маршрут: HomePage, PathPage, LessonPage, ...
│  ├─ features/
│  │  ├─ path-map/               карта пути
│  │  ├─ lesson/                 плеер урока, MDX-компоненты (Goals, Tip, Warning, Term...)
│  │  ├─ quiz/                   движок теста и типы вопросов
│  │  ├─ gamification/           XP-бар, уровни, стрик, тосты достижений, конфетти
│  │  ├─ stats/                  графики статистики
│  │  ├─ simulator/              тренажёр
│  │  ├─ calculators/            калькуляторы
│  │  ├─ journal/                журнал сделок
│  │  ├─ glossary/               глоссарий
│  │  ├─ charts/                 обёртки lightweight-charts (CandleChart, разметка)
│  │  └─ settings/               настройки, экспорт/импорт
│  ├─ components/
│  │  ├─ ui/                     Button, Card, Badge, ProgressBar, Modal, Tabs, Input, Tooltip, Toast
│  │  ├─ diagrams/               SVG-схемы для уроков
│  │  └─ mascot/                 маскот «Бычок Буллик» со всеми эмоциями
│  ├─ content/
│  │  ├─ course.ts               реестр модулей и уроков (метаданные)
│  │  ├─ glossary.ts             термины
│  │  ├─ achievements.ts         определения достижений
│  │  ├─ scenarios.ts            сценарии тренажёра
│  │  ├─ modules/
│  │  │  └─ m03/
│  │  │     ├─ l02/index.mdx     текст урока
│  │  │     ├─ l02/quiz.ts       тест урока
│  │  │     └─ exam.ts           экзамен модуля
│  │  └─ content.test.ts         валидация всего контента
│  ├─ lib/                       чистая логика + тесты
│  │  ├─ gamification/          xp.ts, levels.ts, streak.ts, achievements.ts
│  │  ├─ quiz/grade.ts, quiz/shuffle.ts
│  │  ├─ trading/position.ts, liquidation.ts, rr.ts, fees.ts, simulate.ts
│  │  ├─ journal/metrics.ts
│  │  ├─ progress/              applyEvent.ts (конвейер событий), actions.ts, unlock.ts, migrate.ts, nextStep.ts, read.ts
│  │  ├─ io/exportSchema.ts
│  │  ├─ date.ts, format.ts, cn.ts, random.ts
│  ├─ store/
│  │  ├─ progressStore.ts        прогресс, XP, стрик, достижения (persist)
│  │  ├─ settingsStore.ts        тема, звук, цель дня (persist)
│  │  └─ uiStore.ts              тосты, модалки (не persist)
│  ├─ db/
│  │  └─ db.ts                   Dexie: simTrades, journalTrades
│  ├─ types/                     course.ts, quiz.ts, progress.ts, trading.ts
│  ├─ hooks/                     useMediaQuery, useReducedMotion, useLessonTimer
│  └─ styles/
│     ├─ index.css               tailwind + база
│     └─ tokens.css              дизайн-токены
├─ index.html
├─ vite.config.ts, vitest.config.ts (в vite.config), playwright.config.ts
├─ tsconfig.json, eslint.config.js, .prettierrc
└─ .github/workflows/deploy.yml  (этап 10)
```
