# T-403 · Индикаторы и детекторы

- **Этап:** 04 Графики и пилотный контент (модули 0–3)
- **Статус:** ☐ не начата

## Контекст (прочитать перед началом)
- docs/02-architecture/market-data.md (Индикаторы)

## Что сделать
1. src/lib/indicators: sma, ema, rsi (Wilder), macd, bollinger, atr, findSwings (фрактал n), detectPinBars, detectEngulfing, detectInsideBars
2. Тесты на эталонных значениях (сверить с TradingView вручную на 2–3 точках)

## Файлы
- `src/lib/indicators/*.ts`

## Критерии приёмки
- [ ] Покрытие ≥ 90%
- [ ] Корректное поведение на коротких массивах (меньше периода)
- [ ] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(indicators): add technical indicators and pattern detectors`
