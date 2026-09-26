# T-406 · SVG-схемы для модулей 0–3

- **Этап:** 04 Графики и пилотный контент (модули 0–3)
- **Статус:** ☑ выполнена

## Контекст (прочитать перед началом)
- docs/01-rules/image-sourcing.md
- брифы module-00…03 (разделы Визуалы)

## Что сделать
1. Diagram-реестр `<Diagram name>`
2. Схемы: trading-styles, expectation-vs-reality, course-roadmap, blockchain-chain, transaction-flow, pair-anatomy, order-book (интерактивная), wallet-types, phishing-anatomy, bybit-accounts, network-match, terminal-layout, order-types (интерактивная), candle-anatomy, candle-shapes, tf-aggregation, market-structure, support-resistance, role-reversal, volume-confirmation
3. Единый стиль, цвета из токенов, подписи на русском, адаптивность

## Файлы
- `src/components/diagrams/*.tsx`

## Критерии приёмки
- [x] Все схемы читаемы на 375px и в тёмной теме
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(diagrams): add diagrams for modules 0-3`

## Заметки по реализации
- 19 схем в `src/components/diagrams/m00…m03.tsx`, общий каркас — `kit.tsx` (холст 360 единиц, текст ≥ 13 → на 375px не мельче ~11,5px), цвета — `tones.ts` (токены темы).
- `terminal-layout` не делался: это тот же экран, что SVG-макет `BybitTerminal` из `bybit-mockups.md`, он делается вместе с уроком m02-l03 (T-418), чтобы не рисовать дважды.
- Интерактивные: `order-book` (рыночная покупка «съедает» уровни, логика — `lib/trading/orderbook.ts`) и `order-types` (ползунок цены, ордер срабатывает при касании уровня, логика — `lib/trading/orderTriggers.ts`).
- Проверка: `SHOT_ELEMENTS='figure[data-diagram]' npx tsx scripts/shot.ts "#/dev/ui" 375 dark out.png` — снимок каждой схемы отдельно (витрина — раздел «Схемы» на /dev/ui).
- content.test проверяет, что `<Diagram name>` и `<CandleChart dataset>` в уроках существуют.
