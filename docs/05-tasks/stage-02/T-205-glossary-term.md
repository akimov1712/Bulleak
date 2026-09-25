# T-205 · Модель глоссария и компонент Term

- **Этап:** 02 Движок уроков и тестов
- **Статус:** ☑ выполнена

## Контекст (прочитать перед началом)
- docs/04-features/glossary.md
- docs/03-content/glossary-list.md

## Что сделать
1. Тип Term, src/content/glossary.ts (пока термины урока-образца)
2. Компонент `<Term id>`: поповер (hover/focus/tap) с short и ссылкой на /glossary/:id
3. Неизвестный id — ошибка в dev (console.error запрещён → throw в dev, fallback текст в prod)

## Файлы
- `src/content/glossary.ts`
- `src/features/glossary/Term.tsx`

## Критерии приёмки
- [x] Поповер доступен с клавиатуры и тапом
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(glossary): add glossary model and term popover`
