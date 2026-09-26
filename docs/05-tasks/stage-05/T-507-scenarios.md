# T-507 · Сценарии и связь с уроками

- **Этап:** 05 Тренажёр
- **Статус:** ✅ готово

## Контекст (прочитать перед началом)

## Что сделать
1. Тип SimScenario { id, title, lessonId, dataset, startIndex, task, debrief, expected: long|short|skip, idealZone? }
2. src/content/scenarios.ts: сценарии для уроков M3 (m03-sr-bounce, m03-trend-pullback)
3. Маршрут /simulator/:scenarioId, экран задания и разбора (сравнение с «учебным» решением)
4. MDX-компонент SimScenario (превью + кнопка)

## Файлы
- `src/content/scenarios.ts`
- `src/features/simulator/ScenarioBrief.tsx`
- `src/features/lesson/blocks/SimScenario.tsx`

## Критерии приёмки
- [x] Правильный пропуск засчитывается (для достижения sim-skip)
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(sim): add lesson-linked scenarios`
