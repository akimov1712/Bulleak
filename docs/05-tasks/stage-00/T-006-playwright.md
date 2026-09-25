# T-006 · Playwright: smoke e2e desktop + mobile

- **Этап:** 00 Среда разработки
- **Статус:** ☑ выполнена

## Контекст (прочитать перед началом)
- docs/01-rules/testing-policy.md
- docs/06-qa/test-plan.md

## Что сделать
1. Установить @playwright/test, `npx playwright install chromium`
2. playwright.config.ts: webServer = `npm run build && npm run preview`, projects desktop (1280) и mobile (375, Pixel-подобный)
3. e2e/smoke.spec.ts: страница открывается, заголовок виден, нет ошибок в консоли
4. Скрипт `e2e`

## Файлы
- `playwright.config.ts`
- `e2e/smoke.spec.ts`

## Критерии приёмки
- [x] `npm run e2e` зелёный в обоих проектах
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `test: add playwright smoke tests`
