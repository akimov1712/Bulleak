# T-101 · Утилиты: format, date, seeded random

- **Этап:** 01 Каркас приложения и дизайн-система
- **Статус:** ☐ не начата

## Контекст (прочитать перед началом)
- docs/01-rules/coding-standards.md (Числа и деньги)
- docs/04-features/gamification.md (стрик по локальной дате)

## Что сделать
1. src/lib/format.ts: formatUsd, formatPct (из доли), formatPrice (по шагу), formatNumber, formatR (+1.5R), formatDuration — через Intl ru-RU
2. src/lib/date.ts: toDateKey(ts) по локальной дате, addDays, diffDays(DateKey, DateKey), isSameDay, startOfWeek
3. src/lib/random.ts: mulberry32(seed), shuffle(arr, rng), pick
4. Тесты на всё, включая переход через полночь и DST

## Файлы
- `src/lib/format.ts`
- `src/lib/date.ts`
- `src/lib/random.ts`

## Критерии приёмки
- [ ] Покрытие файлов ≥ 90%
- [ ] shuffle детерминирован для одного seed
- [ ] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(lib): add format, date and seeded random utils`
