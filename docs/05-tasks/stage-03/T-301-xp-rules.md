# T-301 · Правила начисления XP

- **Этап:** 03 Геймификация и карта пути
- **Статус:** ☐ не начата

## Контекст (прочитать перед началом)
- docs/04-features/gamification.md (XP)

## Что сделать
1. src/lib/xp.ts: тип ProgressEvent (lessonRead, quizCompleted, examCompleted, simTrade, journalEntry, calculatorUsed, dailyGoalMet, achievementUnlocked)
2. xpForEvent(state, event, now) → { xp, reasons[] } со всеми ограничениями (один раз, дневные лимиты, до 3 улучшений)
3. Тест на каждую строку таблицы XP

## Файлы
- `src/lib/xp.ts`
- `src/lib/xp.test.ts`

## Критерии приёмки
- [ ] Пересдача без улучшения даёт 0
- [ ] Дневной лимит тренажёра 50 XP
- [ ] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(gamification): add xp rules`
