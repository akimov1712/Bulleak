# T-305 · Единый конвейер событий прогресса

- **Этап:** 03 Геймификация и карта пути
- **Статус:** ☐ не начата

## Контекст (прочитать перед началом)

## Что сделать
1. src/lib/progress/applyEvent.ts: (state, event, now) → { state, rewards: { xp, reasons, levelUp?, newAchievements[], dailyGoalMet?, streakChanged? } } — объединяет xp, streak, activity, achievements, counters
2. progressStore.dispatch(event) вызывает applyEvent и публикует rewards в uiStore
3. Перевести markRead/recordQuiz на dispatch
4. Тесты сценариев целиком

## Файлы
- `src/lib/progress/applyEvent.ts`
- `src/store/progressStore.ts`

## Критерии приёмки
- [ ] Достижение с XP может вызвать level up — корректно в одном событии
- [ ] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(progress): add unified progress event pipeline`
