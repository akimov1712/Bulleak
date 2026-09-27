# T-723 · SVG-схемы и сценарии модуля m07

- **Этап:** 07 Контент: модули 4–8
- **Статус:** ☑ готово

## Контекст (прочитать перед началом)
- docs/01-rules/image-sourcing.md
- брифы docs/03-content/module-07/ (Визуалы, Интерактив)

## Что сделать
1. Схемы: btc-dominance, oi-price-matrix, fear-greed-scale, таблица макрособытий
2. Сценарии тренажёра из брифов модуля в src/content/scenarios.ts (найти подходящие участки истории, записать startIndex и разбор)

## Файлы
- `src/components/diagrams/*.tsx`
- `src/content/scenarios.ts`

## Критерии приёмки
- [x] Схемы читаемы на 375px и в тёмной теме
- [x] Каждый сценарий пройден вручную, разбор соответствует данным
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `content(m07): add diagrams and simulator scenarios`

## Итог
- Схемы в `src/components/diagrams/m07.tsx`: btc-dominance (цифры условные, помечено), oi-price-matrix, fear-greed-scale (границы 0–24 / 25–44 / 45–55 / 56–75 / 76–100 — распространённая разметка, на схеме оговорено, что у сервисов она немного отличается), macro-events (FOMC 8 раз в год, CPI и NFP ежемесячно). Проверены на 375px в обеих темах.
- Сценариев тренажёра в брифах модуля 7 нет — модуль про контекст, а не про сетапы.
- Источники: https://alternative.me/crypto/fear-and-greed-index/ (состав индекса), https://coinmarketcap.com/charts/fear-and-greed-index/ , https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm (8 заседаний в год).
