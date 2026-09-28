# T-728 · SVG-схемы и сценарии модуля m08

- **Этап:** 07 Контент: модули 4–8
- **Статус:** ☑ готово

## Контекст (прочитать перед началом)
- docs/01-rules/image-sourcing.md
- брифы docs/03-content/module-08/ (Визуалы, Интерактив)

## Что сделать
1. Схемы: price-types, long-short-pnl, leverage-margin, liquidation-ladder, funding-flow
2. Сценарии тренажёра из брифов модуля в src/content/scenarios.ts (найти подходящие участки истории, записать startIndex и разбор)

## Файлы
- `src/components/diagrams/*.tsx`
- `src/content/scenarios.ts`

## Критерии приёмки
- [x] Схемы читаемы на 375px и в тёмной теме
- [x] Каждый сценарий пройден вручную, разбор соответствует данным
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `content(m08): add diagrams and simulator scenarios`

## Итог
- Схемы в `src/components/diagrams/m08.tsx`: price-types (прокол Last без движения Mark), long-short-pnl (формулы P&L), leverage-margin (одинаковый убыток по стопу при разном плече), liquidation-ladder (считается `liquidationPrice` из lib, MMR 0,5 %: 2x 49,5 %, 10x 9,5 %, 20x 4,5 %, 100x 0,5 %), funding-flow. Проверены на 375px в обеих темах.
- Сценариев тренажёра в брифах модуля 8 нет.
