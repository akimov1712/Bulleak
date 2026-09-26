# T-501 · Торговая математика

- **Этап:** 05 Тренажёр
- **Статус:** ✅ готово

## Контекст (прочитать перед началом)
- docs/04-features/calculators.md (Формулы)

## Что сделать
1. Сверить с Bybit Help Center: комиссии деривативов, формулу цены ликвидации, MMR для BTCUSDT; записать в calculators.md
2. src/lib/trading/position.ts (qty, риск$, маржа, округление по шагу), fees.ts, liquidation.ts, rr.ts, pnl.ts
3. Тесты с примерами из брифов уроков (numeric-вопросы должны совпадать)

## Файлы
- `src/lib/trading/position.ts`
- `fees.ts`
- `liquidation.ts`
- `rr.ts`
- `pnl.ts`

## Критерии приёмки
- [x] Нет NaN/Infinity на некорректном вводе — возвращается null
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(trading): add position sizing, fees, liquidation math`
