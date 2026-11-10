# T-1403 · Сброс пароля и подтверждение e-mail

- **Этап:** 14 Аккаунт на сайте
- **Статус:** ☐ не начата

## Контекст (прочитать перед началом)
- [ТЗ: аккаунты и бэкенд](../../04-features/accounts-backend.md), разделы 3, 8, 9
- [Бэкенд](../../02-architecture/backend.md)

## Что сделать
1. Страницы `/forgot`, `/reset?token=`, `/verify?token=`.
2. Напоминание подтвердить e-mail и повторная отправка письма.

## Критерии приёмки
- [ ] Тесты: успешный сброс, устаревшая ссылка, подтверждение
- [ ] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(account): add password reset and email verification`
