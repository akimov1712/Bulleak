# Трейдинг на Bybit с нуля

Интерактивный сайт-курс по криптотрейдингу (Bybit, свинг-стиль): 13 модулей, 62 урока, тесты и экзамены, тренажёр на исторических данных Bybit, калькуляторы, журнал сделок, финальный экзамен и сертификат. Прогресс хранится в браузере; после первого визита курс работает офлайн и устанавливается как приложение.

**Сайт:** https://akimov1712.github.io/Bulleak/

> Курс обучающий: он не даёт персональных инвестиционных рекомендаций и не обещает прибыль. Торговля криптовалютой, особенно с плечом, может привести к потере всех вложенных средств.

## Разработка

Нужны Node 24 LTS (минимум 22) и npm.

```
npm ci
npm run dev          # дев-сервер Vite
npm run check        # типы + линтер + формат + unit-тесты
npm run e2e          # Playwright (сам собирает и поднимает preview)
npm run build        # production-сборка в dist/
```

- React 19 + TypeScript, Vite, Tailwind v4, MDX-уроки, lightweight-charts, Dexie (IndexedDB), PWA.
- Бизнес-логика — чистые функции в `src/lib/**` с unit-тестами.
- Документация и ТЗ — в `docs/` (начать с `docs/README.md`), правила для работы — `CLAUDE.md`, установка на новом компьютере — `docs/ONBOARDING.md`.

## Публикация

Каждый push в `main` запускает CI (`.github/workflows/ci.yml`: проверки, сборка, e2e). После зелёного CI воркфлоу `deploy.yml` собирает сайт с `BASE_PATH=/<repo>/` и публикует его на GitHub Pages.

Проверка живого сайта: `PLAYWRIGHT_BASE_URL=https://akimov1712.github.io/Bulleak/ npx playwright test e2e/smoke.spec.ts`.
