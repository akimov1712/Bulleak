# T-1002 · CI и деплой-воркфлоу

- **Этап:** 10 Публикация на GitHub Pages
- **Статус:** ✅ готово

## Контекст (прочитать перед началом)

## Что сделать
1. vite base = `/<repo>/` (через переменную окружения)
2. .github/workflows/ci.yml: npm ci, check, build, e2e (chromium)
3. .github/workflows/deploy.yml: build → actions/upload-pages-artifact → actions/deploy-pages на push в main
4. Проверить сборку с base локально (`npm run build && npm run preview`)

## Файлы
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`

## Критерии приёмки
- [x] Локальная сборка с base открывается корректно (ассеты, данные, PWA)
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `ci: add ci and github pages deploy workflows`

## Итог
- `base` берётся из `BASE_PATH` (деплой ставит `/<repo>/`), локально — `/`.
- Деплой запускается после зелёного CI на main (`workflow_run`) и собирает именно проверенный коммит; есть ручной запуск.
- e2e переходят по относительным адресам (`./#/…`) — тот же набор работает на проде через `PLAYWRIGHT_BASE_URL`.
- Сборка с `/Bulleak/` локально: все 170 e2e зелёные, включая офлайн и манифест.
