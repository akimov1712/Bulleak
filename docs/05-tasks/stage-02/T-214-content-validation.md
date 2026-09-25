# T-214 · Автоматическая валидация контента

- **Этап:** 02 Движок уроков и тестов
- **Статус:** ☑ выполнена

## Контекст (прочитать перед началом)
- docs/02-architecture/content-pipeline.md (Валидация)
- docs/01-rules/testing-policy.md

## Что сделать
1. src/content/content.test.ts: все проверки из content-pipeline.md
2. Пока уроков нет — тест проверяет только существующие файлы и помечает отсутствующие как todo (не падает), с флагом STRICT_CONTENT, который включится на этапе 08

## Файлы
- `src/content/content.test.ts`

## Критерии приёмки
- [x] Намеренная ошибка в quiz-образце роняет тест
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `test(content): add content validation suite`
