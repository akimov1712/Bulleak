# T-605 · Журнал: список, фильтры, KPI, equity curve

- **Этап:** 06 Инструменты: калькуляторы, журнал, глоссарий, статистика, настройки
- **Статус:** ✅ готово

## Контекст (прочитать перед началом)

## Что сделать
1. Установить recharts
2. JournalPage: KPI-плитки, equity curve (R и $), таблица/карточки, фильтры, разбивка по сетапам и эмоциям

## Файлы
- `src/pages/JournalPage.tsx`
- `src/features/journal/*`

## Критерии приёмки
- [x] Таблица на десктопе, карточки на мобильном
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(journal): add journal list with metrics`

## Заметки
- Recharts не ставили: кривая капитала — общий SVG `EquityCurves` (stack.md).
