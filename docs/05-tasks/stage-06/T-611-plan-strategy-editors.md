# T-611 · Редакторы торгового плана и стратегии

- **Этап:** 06 Инструменты: калькуляторы, журнал, глоссарий, статистика, настройки
- **Статус:** ☐ не начата

## Контекст (прочитать перед началом)
- docs/03-content/module-10/lesson-03.md
- docs/03-content/module-11/lesson-02.md

## Что сделать
1. Добавить в ProgressState поля tradingPlan и strategy (миграция v1 → v2 с тестом, обновить data-model.md)
2. TradingPlanEditor (разделы плана, предзаполнение из чек-листов лимитов/рутины)
3. StrategyEditor (правила TPS по умолчанию, редактируемые пункты)
4. Страница /plan с печатью; подключение к BacktestPanel

## Файлы
- `src/features/plan/*`
- `src/pages/PlanPage.tsx`

## Критерии приёмки
- [ ] Миграция старых данных без потерь
- [ ] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(plan): add trading plan and strategy editors`
