# Контент-пайплайн

## Файлы
```
src/content/course.ts                 массив CourseModule[] — единственный реестр порядка и метаданных
src/content/modules/m03/l02/index.mdx текст урока
src/content/modules/m03/l02/quiz.ts   export const quiz: Quiz
src/content/modules/m03/exam.ts       export const exam: Quiz (пул 20–30 вопросов, sample: 15)
src/content/final-exam.ts             финальный экзамен (пул 60, sample: 40)
src/content/glossary.ts               Term[]
src/content/achievements.ts           AchievementDef[]
src/content/scenarios.ts              SimScenario[]
```

## Загрузка
- `src/content/course.ts` **генерируется** скриптом `npm run gen:course` из брифов (`docs/03-content/module-XX/lesson-YY.md`) — править брифы, затем перегенерировать.
- `import.meta.glob('./modules/*/*/index.mdx')` → карта `lessonId → () => import(...)`, урок грузится лениво.
- Аналогично `quiz.ts` и `exam.ts`.
- Путь `modules/m03/l02` ↔ id `m03-l02` (функция `lessonPath(id)` в `lib/content.ts`).

## MDX
- Плагины: `remark-gfm` (таблицы).
- Компоненты передаются через `MDXProvider` (`features/lesson/mdxComponents.tsx`): стилизованные h2/h3/p/ul/table/blockquote + кастомные:

| Компонент | Назначение |
|---|---|
| `<Goals items={[...]}/>` | «Что узнаешь» |
| `<Summary items={[...]}/>` | Итоги |
| `<Tip>`, `<Warning>`, `<Example>`, `<BybitNote>` | Callout-блоки |
| `<Term id="leverage">плечо</Term>` | Термин с поповером из глоссария |
| `<CandleChart dataset="BTCUSDT-240" from={..} to={..} annotations={[...]}/>` | Живой график (опции: `volume`, `indicators`, `logScale` — лог-шкала) с разметкой: `hline`, `zone`, `marker`, `vline`, наклонная `line` (две точки, `extend`), авто-`swings` и авто-`patterns` (`kind`: `pinbar` / `engulfing` / `insidebar`) |
| `<Diagram name="candle-anatomy"/>` | SVG-схема из `components/diagrams` |
| `<Figure src alt caption credit/>` | Фото/скриншот |
| `<MiniQuiz question={...}/>` | Вопрос посреди урока (без XP, для закрепления) |
| `<Reveal title="...">` | Раскрывающийся блок «проверь себя» |
| `<CalcEmbed id="position"/>` | Встроенный калькулятор |
| `<SimScenario id="..."/>` | Кнопка/превью сценария тренажёра. В `scenarios.ts` у сделки есть учебные уровни `ideal`; `idealOutcome: 'sl'` — если учебная сделка по правилам закончилась стопом (по умолчанию тейк, проверяется тестом) |
| `<FibExplorer dataset from to caption/>` | Интерактив: два клика по графику → сетка откатов Фибоначчи и «золотой карман» (`lib/trading/fibonacci`) |
| `<TradingPlanEditor/>` | Редактор торгового плана (тот же, что на `/plan`): 9 разделов с шаблоном курса, сохранение в прогресс |
| `<StrategyEditor/>` | Редактор своей версии стратегии (правила TPS по умолчанию); сохранённые правила — чек-лист бэктеста в тренажёре |
| Ссылка `[текст](/plan)` | Путь приложения, начинающийся с `/`, открывается через роутер (hash-роутер); `http…` — в новой вкладке |
| `<Steps>` / `<Step>` | Пошаговая инструкция (например, в Bybit) |
| `<Compare left right/>` | Сравнение двух понятий (спот vs фьючерсы) |
| `<Checklist items/>` | Чек-лист с галочками (локально) |

## Валидация (`content.test.ts`)
- У каждого урока из `course.ts` есть `index.mdx` и `quiz.ts`; лишних файлов без записи нет.
- Уникальность id уроков, вопросов, терминов, сценариев.
- Квиз: 8–12 вопросов (экзамен — пул ≥ sample), ≥ 2 типа, explanation непустой, correct ссылается на существующий option, numeric tolerance ≥ 0, chart-click dataset существует.
- Все `terms` урока есть в глоссарии; все `scenarioIds` есть в scenarios.
- Все упоминания `<Term id>` в MDX (регэксп по исходнику) существуют в глоссарии.
