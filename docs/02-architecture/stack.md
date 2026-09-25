# Стек

Ограничение окружения: **Node 20.13** → Vite 6 (Vite 7 требует 20.19+).

| Назначение | Библиотека | Зачем |
|---|---|---|
| Сборка | `vite@6`, `@vitejs/plugin-react` | Быстрый дев-сервер, сборка |
| UI | `react@19`, `react-dom@19` | |
| Язык | `typescript@5` (strict) | |
| Роутинг | `react-router@7` (HashRouter) | Работает на GitHub Pages без серверных редиректов |
| Стили | `tailwindcss@4`, `@tailwindcss/vite`, `clsx`, `tailwind-merge` | Токены через `@theme` |
| Анимации | `motion` (Framer Motion), `canvas-confetti` | Переходы, празднования |
| Иконки | `lucide-react` | |
| Контент | `@mdx-js/rollup`, `remark-gfm` | Уроки в MDX с React-компонентами |
| Состояние | `zustand` + `persist` | Прогресс, XP, настройки → localStorage |
| БД в браузере | `dexie` + `dexie-react-hooks` | Журнал сделок, история тренажёра → IndexedDB |
| Валидация | `zod` | Импорт JSON, схемы данных |
| Свечные графики | `lightweight-charts@5` (Apache-2.0, TradingView) | Уроки и тренажёр |
| Статистика | `recharts` | XP, equity curve, точность |
| Шрифты | `@fontsource-variable/nunito`, `@fontsource-variable/jetbrains-mono` | Локально, кириллица, офлайн |
| PWA | `vite-plugin-pwa` (этап 9) | Офлайн |
| Unit/компоненты | `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`, `@vitest/coverage-v8` | |
| E2E | `@playwright/test` (Chromium) | |
| Линт | `eslint@9` (flat), `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, `prettier` | |
| Скрипты | `tsx` | `scripts/fetch-klines.ts` |
| CI/деплой | GitHub Actions → GitHub Pages | Этап 10 |

## Почему так
- **Без бэкенда** — решение пользователя: всё в браузере, бесплатно, офлайн.
- **HashRouter** — GitHub Pages не умеет SPA-фолбэк; hash-URL надёжнее хака с 404.html.
- **MDX** — урок = файл, в текст встраиваются интерактивные компоненты.
- **Dexie** для растущих данных (журнал, сделки тренажёра); localStorage — только для компактного прогресса (< 1 МБ).
- **Статические свечи** вместо живого API: нет CORS/гео-блокировок, воспроизводимые сценарии, работает офлайн.
