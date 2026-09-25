# T-207 · Логика разблокировки уроков

- **Этап:** 02 Движок уроков и тестов
- **Статус:** ☐ не начата

## Контекст (прочитать перед началом)
- docs/04-features/path-map.md (Правила разблокировки)

## Что сделать
1. src/lib/progress/unlock.ts: lessonStatus(id, progress, settings), moduleStatus, examAvailable, finalAvailable
2. Исчерпывающие тесты по правилам path-map.md, включая freeMode

## Файлы
- `src/lib/progress/unlock.ts`
- `src/lib/progress/unlock.test.ts`

## Критерии приёмки
- [ ] Все правила path-map.md покрыты тестами
- [ ] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(progress): add lesson unlock rules`
