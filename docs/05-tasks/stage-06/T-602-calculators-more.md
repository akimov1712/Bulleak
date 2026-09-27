# T-602 · Калькуляторы: матожидание, комиссии, просадка, сложный процент, Монте-Карло

- **Этап:** 06 Инструменты: калькуляторы, журнал, глоссарий, статистика, настройки
- **Статус:** ✅ готово

## Контекст (прочитать перед началом)

## Что сделать
1. lib/trading/expectancy.ts, drawdown.ts, compounding.ts, lib/sim/monteCarlo.ts (seeded) + тесты
2. Калькуляторы expectancy, fees, drawdown, compounding (с предупреждением о нереалистичных %)
3. EquitySimulator: 20 кривых Recharts, распределение макс. просадки и серии

## Файлы
- `src/features/calculators/*`
- `src/lib/sim/monteCarlo.ts`

## Критерии приёмки
- [x] Монте-Карло детерминирован по seed в тестах
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(tools): add expectancy, fees, drawdown and monte carlo tools`

## Заметки
- Сделано заранее в T-408: `lib/trading/compounding.ts` (+тесты) и калькулятор `compounding` (`features/calculators/CompoundingCalc.tsx`). В T-421 сделан и калькулятор `fees` (`lib/trading/fees.ts`, `FeesCalc.tsx`). Осталось: expectancy, drawdown, monteCarlo.
- T-602: `lib/trading/drawdown.ts`, `expectancyProjection` в `rr.ts`, `lib/sim/monteCarlo.ts` (seeded, 500 прогонов, 20 кривых на графике). Кривые рисует собственный лёгкий SVG `EquityCurves` — Recharts для этого не понадобился. Калькуляторы fees и compounding переведены на общий каркас; в fees добавлен funding (m08-l05).
