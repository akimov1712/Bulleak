# T-004 · ESLint 9 + Prettier + скрипт check

- **Этап:** 00 Среда разработки
- **Статус:** ☑ выполнена

## Контекст (прочитать перед началом)
- docs/01-rules/coding-standards.md

## Что сделать
1. eslint.config.js (flat): typescript-eslint strict, react-hooks, jsx-a11y, запрет `no-console` (warn → error в CI), `@typescript-eslint/no-explicit-any: error`
2. .prettierrc: singleQuote, printWidth 100, trailingComma all
3. Скрипты lint, format, check = typecheck + lint + test

## Файлы
- `eslint.config.js`
- `.prettierrc`
- `.prettierignore`

## Критерии приёмки
- [x] `npm run lint` без ошибок на текущем коде
- [x] Намеренный `any` даёт ошибку линта
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `chore: configure eslint and prettier`
