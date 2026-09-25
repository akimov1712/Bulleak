# T-103 · UI-кит 1: Button, IconButton, Card, Badge, Pill

- **Этап:** 01 Каркас приложения и дизайн-система
- **Статус:** ☐ не начата

## Контекст (прочитать перед началом)
- docs/02-architecture/design-system.md

## Что сделать
1. Button: variants primary/secondary/ghost/danger/xp, sizes, 3D-бортик и press-эффект, loading, asChild-ссылка (через компонент Link)
2. IconButton с обязательным aria-label (тип)
3. Card (interactive вариант), Badge, Pill
4. Компонентные тесты: клики, disabled, aria

## Файлы
- `src/components/ui/Button.tsx`
- `src/components/ui/IconButton.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/Badge.tsx`

## Критерии приёмки
- [ ] Фокус виден
- [ ] Контраст текста кнопок ≥ 4.5:1 в обеих темах
- [ ] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(ui): add button, card and badge components`
