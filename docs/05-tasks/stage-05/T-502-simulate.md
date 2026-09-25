# T-502 · Симуляция исполнения сделки

- **Этап:** 05 Тренажёр
- **Статус:** ☐ не начата

## Контекст (прочитать перед началом)
- docs/04-features/simulator.md (Логика)

## Что сделать
1. src/lib/trading/simulate.ts: simulateTrade и stepTrade (для пошагового воспроизведения)
2. Тесты: TP, SL, обе в одной свече → SL, гэп, timeout, short, комиссии, ручное закрытие

## Файлы
- `src/lib/trading/simulate.ts`

## Критерии приёмки
- [ ] Все кейсы из simulator.md покрыты
- [ ] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(sim): add trade simulation engine`
