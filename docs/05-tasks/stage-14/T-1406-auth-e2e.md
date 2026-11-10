# T-1406 · E2e авторизации

- **Этап:** 14 Аккаунт на сайте
- **Статус:** ☑ готова

## Контекст (прочитать перед началом)
- [ТЗ: аккаунты и бэкенд](../../04-features/accounts-backend.md), разделы 3, 8, 9
- [Бэкенд](../../02-architecture/backend.md)

## Что сделать
1. Playwright поднимает локальный API на PGlite; регистрация, выход, вход, сброс пароля по письму из лога.

## Критерии приёмки
- [x] E2e зелёные в CI
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Примечание:** API в e2e работает в тестовом режиме с базой в памяти; письма пишутся в test-results/mail-outbox.jsonl (MAIL_OUTBOX запрещён в production). Прогон — в CI.

**Коммит:** `test(account): add authentication e2e`
