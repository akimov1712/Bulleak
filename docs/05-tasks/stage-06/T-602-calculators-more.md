# T-602 · Калькуляторы: матожидание, комиссии, просадка, сложный процент, Монте-Карло

- **Этап:** 06 Инструменты: калькуляторы, журнал, глоссарий, статистика, настройки
- **Статус:** ☐ не начата

## Контекст (прочитать перед началом)

## Что сделать
1. lib/trading/expectancy.ts, drawdown.ts, compounding.ts, lib/sim/monteCarlo.ts (seeded) + тесты
2. Калькуляторы expectancy, fees, drawdown, compounding (с предупреждением о нереалистичных %)
3. EquitySimulator: 20 кривых Recharts, распределение макс. просадки и серии

## Файлы
- `src/features/calculators/*`
- `src/lib/sim/monteCarlo.ts`

## Критерии приёмки
- [ ] Монте-Карло детерминирован по seed в тестах
- [ ] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(tools): add expectancy, fees, drawdown and monte carlo tools`

## Заметки
- Сделано заранее в T-408: `lib/trading/compounding.ts` (+тесты) и калькулятор `compounding` (`features/calculators/CompoundingCalc.tsx`). Осталось: expectancy, fees, drawdown, monteCarlo.
