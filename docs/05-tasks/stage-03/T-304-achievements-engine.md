# T-304 · Движок достижений

- **Этап:** 03 Геймификация и карта пути
- **Статус:** ☐ не начата

## Контекст (прочитать перед началом)
- docs/03-content/achievements-list.md

## Что сделать
1. src/content/achievements.ts: все 40 определений
2. src/lib/achievements.ts: evaluate(state, ctx, now) → новые id
3. Тест на каждое достижение (минимальное состояние, которое его открывает, и почти-состояние, которое не открывает)

## Файлы
- `src/content/achievements.ts`
- `src/lib/achievements.ts`

## Критерии приёмки
- [ ] 40 достижений, id уникальны
- [ ] Повторно не выдаются
- [ ] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(gamification): add achievements engine`
