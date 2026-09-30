# T-1301 · npm workspaces и общий пакет shared

- **Этап:** 13 Сервер и авторизация
- **Статус:** ☐ не начата

## Контекст (прочитать перед началом)
- [ТЗ: аккаунты и бэкенд](../../04-features/accounts-backend.md)

## Что сделать
1. Корень — фронтенд, workspaces `shared` и `server`.
2. `@bulleak/shared`: zod, схемы контракта API — формат ошибки, правила e-mail/пароля/имени, тела регистрации и входа, публичный профиль пользователя.
3. `npm run check` проверяет фронтенд, shared и server.

## Критерии приёмки
- [ ] Фронтенд собирается и тестируется как раньше
- [ ] Схемы shared покрыты тестами
- [ ] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `chore(repo): add npm workspaces and shared package`
