# T-510 · Режим бэктеста

- **Этап:** 05 Тренажёр
- **Статус:** ✅ готово

## Контекст (прочитать перед началом)
- docs/03-content/module-11/lesson-04.md

## Что сделать
1. Флаг strategyTag в SimTrade, запуск «Бэктест TPS»
2. Боковая панель с чек-листом правил стратегии (из StrategyEditor, пока — правила TPS по умолчанию)
3. Счётчик N/30 и отчёт бэктеста (метрики из lib/journal/metrics после T-604 — пока базовые)

## Файлы
- `src/features/simulator/BacktestPanel.tsx`

## Критерии приёмки
- [x] Сделки бэктеста не смешиваются со свободными в статистике
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(sim): add backtest mode`
