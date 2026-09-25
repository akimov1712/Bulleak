# T-302 · Уровни и ранги

- **Этап:** 03 Геймификация и карта пути
- **Статус:** ☑ выполнена

## Контекст (прочитать перед началом)
- docs/04-features/gamification.md (Уровни)

## Что сделать
1. src/lib/levels.ts: xpFor(level), levelFromXp(xp) → { level, rank, current, next, progress }
2. Проверить суммарный XP курса и достижимость 20 уровня (оценка в тесте на основе course.ts)

## Файлы
- `src/lib/levels.ts`

## Критерии приёмки
- [x] levelFromXp монотонна, 0 XP = уровень 1
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(gamification): add levels and ranks`
