# T-210 · Логика тестов: подготовка и оценка

- **Этап:** 02 Движок уроков и тестов
- **Статус:** ☑ выполнена

## Контекст (прочитать перед началом)
- docs/04-features/quiz-engine.md (Логика)
- docs/03-content/quiz-spec.md

## Что сделать
1. src/lib/quiz/prepare.ts: prepareQuiz(quiz, seed) с sample (стратификация по тегам) и перемешиванием
2. src/lib/quiz/grade.ts: gradeQuestion для всех 7 типов, gradeQuiz
3. Тесты: каждая ветка, граница 80%, numeric tolerance, пустые ответы

## Файлы
- `src/lib/quiz/prepare.ts`
- `src/lib/quiz/grade.ts`

## Критерии приёмки
- [x] 8/10 сдан, 7/10 нет, 9/12 нет, 10/12 сдан
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(quiz): add quiz preparation and grading logic`
