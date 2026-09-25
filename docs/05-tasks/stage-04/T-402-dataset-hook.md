# T-402 · Загрузка датасетов в приложении

- **Этап:** 04 Графики и пилотный контент (модули 0–3)
- **Статус:** ☐ не начата

## Контекст (прочитать перед началом)

## Что сделать
1. src/lib/trading/candles.ts: parseDataset, sliceCandles, resample (1H→4H для проверки)
2. features/charts/useDataset(name) с кэшем и Suspense
3. Тесты parse/resample

## Файлы
- `src/lib/trading/candles.ts`
- `src/features/charts/useDataset.ts`

## Критерии приёмки
- [ ] resample 1H→4H совпадает с загруженным 4H на пересечении (допуск по объёму)
- [ ] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(charts): add dataset loading and candle utils`
