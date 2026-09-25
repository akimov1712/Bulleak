# T-107 · Роутинг и страницы-заглушки

- **Этап:** 01 Каркас приложения и дизайн-система
- **Статус:** ☑ выполнена

## Контекст (прочитать перед началом)
- docs/02-architecture/routing.md

## Что сделать
1. Установить react-router@7, HashRouter
2. src/app/routes.tsx: все маршруты из routing.md, lazy-страницы, Suspense со скелетоном
3. Заглушка каждой страницы: заголовок + EmptyState «Скоро здесь будет…»
4. NotFoundPage с маскотом
5. ScrollToTop при смене маршрута

## Файлы
- `src/app/routes.tsx`
- `src/pages/*.tsx`

## Критерии приёмки
- [x] Все URL из routing.md открываются
- [x] Неизвестный URL → 404
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(app): add routing with page placeholders`
