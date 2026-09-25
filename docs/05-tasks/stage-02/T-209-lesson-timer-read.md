# T-209 · Таймер активного времени и правило «урок прочитан»

- **Этап:** 02 Движок уроков и тестов
- **Статус:** ☑ выполнена

## Контекст (прочитать перед началом)
- docs/04-features/lesson-player.md (Поведение)

## Что сделать
1. useLessonTimer: считает только при видимой вкладке и активности за 60 с; сохраняет раз в 15 с и при уходе
2. Правило прочитанности в lib/progress/read.ts (чистая функция) + IntersectionObserver на Summary
3. Тесты с фейковым временем

## Файлы
- `src/hooks/useLessonTimer.ts`
- `src/lib/progress/read.ts`

## Критерии приёмки
- [x] XP за чтение ровно один раз (пока без XP — флаг readAt; XP подключается на этапе 03)
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(lesson): track active time and read state`
