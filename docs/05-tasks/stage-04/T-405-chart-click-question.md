# T-405 · Вопрос chart-click и MDX-компонент CandleChart

- **Этап:** 04 Графики и пилотный контент (модули 0–3)
- **Статус:** ☐ не начата

## Контекст (прочитать перед началом)
- docs/04-features/quiz-engine.md

## Что сделать
1. ChartClickQuestion: клик ставит маркер цены/свечи, можно переставить; подсветка правильной зоны после проверки
2. Добавить CandleChart и Diagram в mdxComponents
3. Компонентный тест с моком графика

## Файлы
- `src/features/quiz/questions/ChartClickQuestion.tsx`

## Критерии приёмки
- [ ] Работает мышью и тапом; альтернативный ввод цены числом для доступности
- [ ] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(quiz): add chart click question type`
