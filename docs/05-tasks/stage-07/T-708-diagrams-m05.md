# T-708 · SVG-схемы и сценарии модуля m05

- **Этап:** 07 Контент: модули 4–8
- **Статус:** ☑ готово

## Контекст (прочитать перед началом)
- docs/01-rules/image-sourcing.md
- брифы docs/03-content/module-05/ (Визуалы, Интерактив)

## Что сделать
1. Схемы: indicator-families, macd-anatomy, clean-vs-cluttered
2. Сценарии тренажёра из брифов модуля в src/content/scenarios.ts (найти подходящие участки истории, записать startIndex и разбор)

## Файлы
- `src/components/diagrams/*.tsx`
- `src/content/scenarios.ts`

## Критерии приёмки
- [x] Схемы читаемы на 375px и в тёмной теме
- [x] Каждый сценарий пройден вручную, разбор соответствует данным
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `content(m05): add diagrams and simulator scenarios`

## Итог
- Схемы в `src/components/diagrams/m05.tsx`: indicator-families, macd-anatomy (MACD считается функцией `ema` из lib на синтетическом ряду), clean-vs-cluttered. Проверены на 375px в обеих темах.
- Сценарий `m05-clean-chart` — BTCUSDT-240, 20.04.2026 00:00 (индекс 2048): откат в зону 73 450–73 800, EMA 50 ≈ 74 400, цена выше EMA 200 ≈ 71 600. Лонг, SL 73 100, TP 77 900 (R:R ≈ 1 : 2,2), цель 22.04. Сканирование истории показало, что «касание EMA 50» само по себе часто не срабатывает — это отражено в разборе.
