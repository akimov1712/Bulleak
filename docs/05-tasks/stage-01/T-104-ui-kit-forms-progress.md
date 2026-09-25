# T-104 · UI-кит 2: прогресс и формы

- **Этап:** 01 Каркас приложения и дизайн-система
- **Статус:** ☑ выполнена

## Контекст (прочитать перед началом)

## Что сделать
1. Установить motion
2. ProgressBar (анимированное заполнение), ProgressRing (SVG)
3. Tabs (клавиатура стрелками, role=tablist)
4. Input, NumberInput (принимает `,` и `.`, единицы, min/max/step, onValueChange(number|null)), Select, Switch
5. Тесты NumberInput на парсинг

## Файлы
- `src/components/ui/ProgressBar.tsx`
- `src/components/ui/ProgressRing.tsx`
- `src/components/ui/Tabs.tsx`
- `src/components/ui/NumberInput.tsx`
- `src/components/ui/Switch.tsx`

## Критерии приёмки
- [x] NumberInput: "1 234,5" → 1234.5, пустое → null
- [x] Tabs доступны с клавиатуры
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(ui): add progress, tabs and form inputs`
