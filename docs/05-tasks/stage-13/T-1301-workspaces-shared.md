# T-1301 · npm workspaces и общий пакет shared

- **Этап:** 13 Сервер и авторизация
- **Статус:** ✅ готово

## Контекст (прочитать перед началом)
- [ТЗ: аккаунты и бэкенд](../../04-features/accounts-backend.md)

## Что сделать
1. Корень — фронтенд, workspaces `shared` и `server`.
2. `@bulleak/shared`: zod, схемы контракта API — формат ошибки, правила e-mail/пароля/имени, тела регистрации и входа, публичный профиль пользователя.
3. `npm run check` проверяет фронтенд, shared и server.

## Критерии приёмки
- [x] Фронтенд собирается и тестируется как раньше
- [x] Схемы shared покрыты тестами
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `chore(repo): add npm workspaces and shared package`

## Итог
- Корневой `package.json` — фронтенд + `workspaces: ["shared"]` (`server` добавится в T-1302). Пакет `@bulleak/shared` отдаёт TypeScript-исходники (`exports: ./src/index.ts`) — Vite и tsc собирают его вместе с приложением, отдельной сборки нет.
- Схемы: формат ошибки API и коды, `fieldErrors` для форм, e-mail (нормализация), пароль (8–128), имя, тела регистрации и входа, публичный профиль, ответ авторизации. Сообщения — по-русски.
- zod — зависимость shared (в node_modules он уже был транзитивно). Тесты shared подключены к vitest корня.
