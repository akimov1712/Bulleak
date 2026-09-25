# T-303 · Стрик и заморозки

- **Этап:** 03 Геймификация и карта пути
- **Статус:** ☐ не начата

## Контекст (прочитать перед началом)
- docs/04-features/gamification.md (Стрик)

## Что сделать
1. src/lib/streak.ts: applyActivity(streak, dayKey) с заморозками, getWeekView(activity, today)
2. Тесты: вчера/сегодня/пропуск 1–3 дня с заморозками и без, начисление заморозок каждые 7 дней, максимум 2

## Файлы
- `src/lib/streak.ts`

## Критерии приёмки
- [ ] Все сценарии покрыты тестами
- [ ] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(gamification): add streak with freezes`
