# T-003 · Tailwind v4, базовые токены и шрифты

- **Этап:** 00 Среда разработки
- **Статус:** ☑ выполнена

## Контекст (прочитать перед началом)
- docs/02-architecture/design-system.md

## Что сделать
1. Установить tailwindcss@4, @tailwindcss/vite, clsx, tailwind-merge
2. src/styles/index.css: `@import "tailwindcss"`, подключение tokens.css
3. src/styles/tokens.css: все цвета из design-system.md через `@theme` + переопределение для `[data-theme=dark]`
4. Шрифты @fontsource-variable/nunito и jetbrains-mono, font-family в @theme
5. src/lib/cn.ts
6. Заглушка App показывает кнопку в цветах primary для проверки

## Файлы
- `src/styles/index.css`
- `src/styles/tokens.css`
- `src/lib/cn.ts`

## Критерии приёмки
- [x] Классы `bg-primary`, `text-bull`, `font-mono` работают
- [x] Смена `data-theme` на html меняет цвета
- [x] Шрифты грузятся локально (нет запросов к Google Fonts)
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `chore: add tailwind v4 with design tokens and fonts`
