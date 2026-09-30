# T-1308 · CI сервера

- **Этап:** 13 Сервер и авторизация
- **Статус:** ☐ не начата

## Контекст (прочитать перед началом)
- [ТЗ: аккаунты и бэкенд](../../04-features/accounts-backend.md)

## Что сделать
1. Job сервера в `ci.yml`: typecheck, lint, тесты (PGlite, без внешних сервисов).
2. Документация: `docs/02-architecture/backend.md`, ONBOARDING (запуск сервера), CLAUDE.md (правило секретов, команды).

## Критерии приёмки
- [ ] CI зелёный
- [ ] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `ci: add server checks`
