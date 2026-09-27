# T-604 · Логика журнала: P&L и метрики

- **Этап:** 06 Инструменты: калькуляторы, журнал, глоссарий, статистика, настройки
- **Статус:** ✅ готово

## Контекст (прочитать перед началом)
- docs/04-features/journal.md

## Что сделать
1. src/lib/journal/pnl.ts (P&L, R для long/short с комиссиями)
2. src/lib/journal/metrics.ts: winrate, PF, avg R, expectancy, max DD, серии, длительность, % по плану, группировки по сетапу/эмоции
3. Тесты: пусто, только плюс, только минус, смешанные

## Файлы
- `src/lib/journal/pnl.ts`
- `src/lib/journal/metrics.ts`

## Критерии приёмки
- [x] PF без убытков → null (UI «—»)
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(journal): add pnl and metrics calculations`
