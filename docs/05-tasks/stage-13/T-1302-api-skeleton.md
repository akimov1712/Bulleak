# T-1302 · Каркас API и конфигурация

- **Этап:** 13 Сервер и авторизация
- **Статус:** ✅ готово

## Контекст (прочитать перед началом)
- [ТЗ: аккаунты и бэкенд](../../04-features/accounts-backend.md)

## Что сделать
1. `server/`: Hono на Node 24, `GET /api/v1/health`.
2. Конфиг из env с zod-проверкой (`DATABASE_URL`, `JWT_SECRET`, `APP_ORIGIN`, …), `.env.example`, `.env` в `.gitignore`.
3. Единый обработчик ошибок в формате shared, логгер без секретов, лимит тела запроса, CORS только для `APP_ORIGIN`.
4. `npm run dev:server`.

## Критерии приёмки
- [x] Тесты: health, 404 и 413 в формате ошибки, CORS
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(server): add api skeleton and env config`

## Итог
- `server/` — workspace `@bulleak/server`: Hono + `@hono/node-server`, запуск `npm run dev:server` (tsx watch, `server/.env` при наличии), `GET /api/v1/health`.
- Конфиг из env через zod (`NODE_ENV`, `PORT`, `APP_ORIGIN`, `JWT_SECRET`, `BODY_LIMIT`): в production без секрета ≥ 32 символов и `APP_ORIGIN` сервер не стартует и перечисляет проблемы; вне production — безопасные значения по умолчанию. `server/.env.example`, `.env` в `.gitignore`.
- Ошибки — `HttpError` → формат из shared; 404 и 413 в том же формате; неожиданные ошибки — 500 без деталей наружу, детали в лог.
- Логгер — JSON-строки в stdout/stderr, ключи с pass/token/secret/authorization/cookie заменяются на `[redacted]`.
- CORS только для `APP_ORIGIN`, с credentials.
- `npm run check` проверяет и сервер (typecheck + тесты), ESLint — Node-окружение для `server/` и `shared/`. Ручной запуск: health 200, неизвестный адрес — 404 в формате API.
