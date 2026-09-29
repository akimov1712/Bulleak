# T-1004 · Проверка живого сайта

- **Этап:** 10 Публикация на GitHub Pages
- **Статус:** ✅ готово

## Контекст (прочитать перед началом)

## Что сделать
1. Smoke e2e против продакшен-URL (PLAYWRIGHT_BASE_URL)
2. Проверка на мобильном размере, установка PWA
3. Записать ссылку в README.md проекта и PROGRESS.md

## Файлы
- `README.md`

## Критерии приёмки
- [x] Smoke-тест зелёный на проде
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `docs: add project readme with live link`

## Итог
- `PLAYWRIGHT_BASE_URL=https://akimov1712.github.io/Bulleak/` — smoke, офлайн (сервис-воркер, манифест для установки), урок → тест, тренажёр: 42/42 на desktop и mobile.
- 375 px: карта курса без горизонтальной прокрутки.
- Ссылка записана в README.md и PROGRESS.md.
