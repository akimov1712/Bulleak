# T-1305 · Ротация refresh-токена и выход

- **Этап:** 13 Сервер и авторизация
- **Статус:** ☐ не начата

## Контекст (прочитать перед началом)
- [ТЗ: аккаунты и бэкенд](../../04-features/accounts-backend.md)

## Что сделать
1. `POST /auth/refresh` с ротацией; повторное использование старого токена отзывает всю семью сессий.
2. `POST /auth/logout`, `POST /auth/logout-all`.
3. Доставка refresh-токена: cookie (`HttpOnly; Secure; SameSite`) или тело ответа — по режиму из конфига (раздел 8 ТЗ).

## Критерии приёмки
- [ ] Тесты: ротация, повторное использование, истечение, выход
- [ ] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(auth): add refresh rotation and logout`
