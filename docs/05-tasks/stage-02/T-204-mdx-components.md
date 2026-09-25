# T-204 · MDX-компоненты оформления

- **Этап:** 02 Движок уроков и тестов
- **Статус:** ☐ не начата

## Контекст (прочитать перед началом)
- docs/02-architecture/content-pipeline.md (таблица компонентов)
- docs/01-rules/content-guidelines.md

## Что сделать
1. mdxComponents.tsx: стили h2/h3/p/ul/ol/table/blockquote/code/a
2. Goals, Summary, Tip, Warning, Example, BybitNote, Figure (lazy img, caption, credit), Reveal, Steps/Step, Compare, Checklist (состояние в localStorage по id)
3. MiniQuiz — использует компоненты вопросов из T-212 (добавить после неё, пока заглушка)
4. Все компоненты в уроке-образце

## Файлы
- `src/features/lesson/mdxComponents.tsx`
- `src/features/lesson/blocks/*.tsx`

## Критерии приёмки
- [ ] Все блоки выглядят хорошо в обеих темах и на 375px
- [ ] Таблицы на мобильном скроллятся внутри контейнера
- [ ] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(lesson): add mdx content blocks`
