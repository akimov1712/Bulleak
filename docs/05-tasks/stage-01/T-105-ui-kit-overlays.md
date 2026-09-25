# T-105 · UI-кит 3: Modal/Sheet, Popover/Tooltip, Toast, Skeleton, EmptyState

- **Этап:** 01 Каркас приложения и дизайн-система
- **Статус:** ☐ не начата

## Контекст (прочитать перед началом)

## Что сделать
1. Modal (фокус-ловушка, Esc, портал), Sheet (нижний лист на мобильном)
2. Popover/Tooltip (позиционирование — простая собственная реализация или @floating-ui/react)
3. uiStore + Toaster (очередь, автоскрытие, варианты success/error/xp/achievement)
4. Skeleton, EmptyState (слот для маскота)

## Файлы
- `src/components/ui/Modal.tsx`
- `src/components/ui/Sheet.tsx`
- `src/components/ui/Popover.tsx`
- `src/components/ui/Toaster.tsx`
- `src/store/uiStore.ts`

## Критерии приёмки
- [ ] Модалка закрывается по Esc и возвращает фокус
- [ ] Тосты не перекрывают нижнюю навигацию на мобильном
- [ ] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(ui): add modal, popover and toast system`
