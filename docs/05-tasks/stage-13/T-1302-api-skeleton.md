# T-1302 · Каркас API и конфигурация

- **Этап:** 13 Сервер и авторизация
- **Статус:** ☐ не начата

## Контекст (прочитать перед началом)
- [ТЗ: аккаунты и бэкенд](../../04-features/accounts-backend.md)

## Что сделать
1. `server/`: Hono на Node 24, `GET /api/v1/health`.
2. Конфиг из env с zod-проверкой (`DATABASE_URL`, `JWT_SECRET`, `APP_ORIGIN`, …), `.env.example`, `.env` в `.gitignore`.
3. Единый обработчик ошибок в формате shared, логгер без секретов, лимит тела запроса, CORS только для `APP_ORIGIN`.
4. `npm run dev:server`.

## Критерии приёмки
- [ ] Тесты: health, 404 и 413 в формате ошибки, CORS
- [ ] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(server): add api skeleton and env config`
