# T-1405 · Сборка без API

- **Этап:** 14 Аккаунт на сайте
- **Статус:** ☐ не начата

## Контекст (прочитать перед началом)
- [ТЗ: аккаунты и бэкенд](../../04-features/accounts-backend.md), разделы 3, 8, 9
- [Бэкенд](../../02-architecture/backend.md)

## Что сделать
1. Без `VITE_API_URL` нет кнопок входа и страниц аккаунта; e2e это проверяет.

## Критерии приёмки
- [ ] E2e гостевого режима зелёный
- [ ] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(account): hide accounts without API url`
