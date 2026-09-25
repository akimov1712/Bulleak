# T-211 · Поток теста: старт → вопросы → результат

- **Этап:** 02 Движок уроков и тестов
- **Статус:** ☑ выполнена

## Контекст (прочитать перед началом)
- docs/04-features/quiz-engine.md (Поток)

## Что сделать
1. QuizPage и QuizRunner: экран старта, сегментный прогресс, «Проверить» → плашка обратной связи → «Дальше»
2. Выход с подтверждением (попытка не засчитывается)
3. Экран результата: кольцо, звёзды, список ошибок с объяснениями, кнопки
4. Режим экзамена (explanations в конце) — флаг

## Файлы
- `src/pages/QuizPage.tsx`
- `src/features/quiz/QuizRunner.tsx`
- `src/features/quiz/QuizResult.tsx`

## Критерии приёмки
- [x] Результат записывается в progress (recordQuiz)
- [x] Перезагрузка посреди теста → тест начинается заново
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(quiz): add quiz runner flow and result screen`
