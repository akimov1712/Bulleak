# T-106 · Маскот «Бычок Буллик»

- **Этап:** 01 Каркас приложения и дизайн-система
- **Статус:** ☑ выполнена

## Контекст (прочитать перед началом)
- docs/02-architecture/design-system.md (Маскот)

## Что сделать
1. SVG-компонент Mascot({ mood, size }) — moods: happy, thinking, cheering, sad, sleeping, pointing, shocked
2. Цвета из токенов, дыхание-анимация (отключается reduced motion)
3. Опционально пузырь реплики MascotSay({ mood, children })

## Файлы
- `src/components/mascot/Mascot.tsx`
- `src/components/mascot/MascotSay.tsx`

## Критерии приёмки
- [x] Все 7 настроений визуально различимы
- [x] Хорошо выглядит в обеих темах, от 48 до 200px
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(mascot): add bull mascot with moods`
