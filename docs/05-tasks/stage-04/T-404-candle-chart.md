# T-404 · Компонент CandleChart

- **Этап:** 04 Графики и пилотный контент (модули 0–3)
- **Статус:** ☑ выполнена

## Контекст (прочитать перед началом)
- docs/02-architecture/content-pipeline.md (CandleChart)

## Что сделать
1. Установить lightweight-charts@5
2. CandleChart({ dataset, from, to, annotations, indicators, volume, height, interactive, onPick })
3. Аннотации: горизонтальные линии, зоны (прямоугольники), маркеры свечей, подписи HH/HL, вертикальные метки
4. Цвета из токенов, перерисовка при смене темы, ResizeObserver
5. Панели индикаторов (RSI/MACD/ATR) отдельными панами
6. Атрибуция TradingView по лицензии

## Файлы
- `src/features/charts/CandleChart.tsx`
- `src/features/charts/annotations.ts`

## Критерии приёмки
- [x] Работает на 375px (жесты, без перехвата скролла страницы)
- [x] Нет утечек при размонтировании
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(charts): add candle chart with annotations and indicators`
