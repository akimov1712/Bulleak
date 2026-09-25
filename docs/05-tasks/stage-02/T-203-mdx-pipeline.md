# T-203 · MDX-пайплайн и ленивая загрузка уроков

- **Этап:** 02 Движок уроков и тестов
- **Статус:** ☑ выполнена

## Контекст (прочитать перед началом)
- docs/02-architecture/content-pipeline.md

## Что сделать
1. Установить @mdx-js/rollup, @mdx-js/react, remark-gfm, @types/mdx
2. Подключить в vite.config.ts (enforce pre)
3. src/content/loaders.ts: import.meta.glob для index.mdx, quiz.ts, exam.ts → loadLesson(id), loadQuiz(id), loadExam(moduleId)
4. Урок-заглушка m00-l01/index.mdx и quiz.ts

## Файлы
- `src/content/loaders.ts`
- `src/content/modules/m00/l01/index.mdx`
- `src/content/modules/m00/l01/quiz.ts`

## Критерии приёмки
- [x] MDX-урок рендерится
- [x] Каждый урок — отдельный чанк в сборке
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(lesson): add mdx pipeline with lazy lesson loading`
