# Этап 00 · Среда разработки

## Цель
Репозиторий, каркас Vite + React + TS, линтеры, тесты, e2e и превью работают. Любая следующая задача может сразу писать код и проверять его.

## Результат этапа (демонстрация пользователю)
- `npm run dev` открывает стартовую страницу во встроенном браузере
- `npm run check` и `npm run e2e` зелёные

## Задачи
| ID | Задача | Статус |
|---|---|---|
| [T-001](T-001-git-init.md) | Инициализировать git и закоммитить ТЗ | ☑ |
| [T-002](T-002-vite-scaffold.md) | Каркас Vite 6 + React 19 + TypeScript strict | ☑ |
| [T-003](T-003-tailwind-fonts.md) | Tailwind v4, базовые токены и шрифты | ☑ |
| [T-004](T-004-eslint-prettier.md) | ESLint 9 + Prettier + скрипт check | ☑ |
| [T-005](T-005-vitest.md) | Vitest + Testing Library + покрытие | ☑ |
| [T-006](T-006-playwright.md) | Playwright: smoke e2e desktop + mobile | ☐ |
| [T-007](T-007-preview-config.md) | Конфигурация превью и проверка в браузере | ☐ |

## Завершение этапа
- [ ] Все задачи закрыты
- [ ] `/code-review` → исправления → запись в `docs/06-qa/review-log.md`
- [ ] `npm run e2e` и `npm run build` зелёные
- [ ] Демонстрация пользователю, фидбэк в `docs/PROGRESS.md`
- [ ] Тег `stage-00-done`
