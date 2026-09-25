# T-005 · Vitest + Testing Library + покрытие

- **Этап:** 00 Среда разработки
- **Статус:** ☐ не начата

## Контекст (прочитать перед началом)
- docs/01-rules/testing-policy.md

## Что сделать
1. Установить vitest, @vitest/coverage-v8, jsdom, @testing-library/react, @testing-library/user-event, @testing-library/jest-dom
2. Секция test в vite.config.ts: environment jsdom, setupFiles `src/test/setup.ts`, coverage include `src/lib/**` threshold lines 90
3. Пример: тест для cn.ts и рендер-тест App

## Файлы
- `src/test/setup.ts`
- `src/lib/cn.test.ts`
- `src/app/App.test.tsx`

## Критерии приёмки
- [ ] `npm test` зелёный
- [ ] `npm run test:coverage` формирует отчёт
- [ ] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `test: set up vitest with testing library`
