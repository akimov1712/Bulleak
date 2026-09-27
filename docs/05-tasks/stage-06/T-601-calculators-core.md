# T-601 · Калькуляторы: позиция, ликвидация, R:R

- **Этап:** 06 Инструменты: калькуляторы, журнал, глоссарий, статистика, настройки
- **Статус:** ✅ готово

## Контекст (прочитать перед началом)
- docs/04-features/calculators.md

## Что сделать
1. Общий каркас CalculatorCard (поля, результат, «как считается», сброс, запоминание значений)
2. Калькуляторы position, liquidation, rr на функциях из lib/trading
3. ToolsPage со списком и /tools/:calcId
4. Событие calculatorUsed

## Файлы
- `src/pages/ToolsPage.tsx`
- `src/features/calculators/*`

## Критерии приёмки
- [x] Некорректный ввод → «—» и подсказка
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(tools): add position, liquidation and rr calculators`
