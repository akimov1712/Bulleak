# T-202 · Реестр курса: 13 модулей, 62 урока

- **Этап:** 02 Движок уроков и тестов
- **Статус:** ☐ не начата

## Контекст (прочитать перед началом)
- docs/03-content/content-plan.md

## Что сделать
1. src/content/course.ts: все модули (цвет, иконка, описание) и уроки (id, title, summary, minutes, terms из брифов, practice)
2. Хелперы в src/lib/content.ts: getModule, getLesson, lessonPath, allLessons (упорядоченно), nextLesson, prevLesson
3. Тесты хелперов

## Файлы
- `src/content/course.ts`
- `src/lib/content.ts`

## Критерии приёмки
- [ ] 62 урока, id уникальны и соответствуют content-plan.md
- [ ] nextLesson последнего урока модуля → первый урок следующего
- [ ] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(content): add course registry with all lessons`
