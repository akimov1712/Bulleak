# T-002 · Каркас Vite 6 + React 19 + TypeScript strict

- **Этап:** 00 Среда разработки
- **Статус:** ☐ не начата

## Контекст (прочитать перед началом)
- docs/02-architecture/stack.md
- docs/02-architecture/folder-structure.md
- docs/01-rules/coding-standards.md

## Что сделать
1. Создать package.json вручную (не через интерактивный create-vite), установить vite@6, @vitejs/plugin-react, react@19, react-dom@19, typescript, @types/react, @types/react-dom
2. tsconfig: strict, noUncheckedIndexedAccess, noUnusedLocals/Parameters, paths `@/*` → `src/*`, moduleResolution bundler
3. vite.config.ts с алиасом `@`
4. index.html (lang=ru, meta viewport, theme-color), src/main.tsx, src/app/App.tsx с заглушкой «Трейдинг на Bybit с нуля»
5. Скрипты: dev, build, preview, typecheck (`tsc -b --noEmit` или `tsc --noEmit`)

## Файлы
- `package.json`
- `tsconfig.json`
- `vite.config.ts`
- `index.html`
- `src/main.tsx`
- `src/app/App.tsx`

## Критерии приёмки
- [ ] `npm run build` без ошибок
- [ ] `npm run typecheck` без ошибок
- [ ] Импорт через `@/` работает
- [ ] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `chore: scaffold vite react typescript app`
