# T-108 · AppShell: сайдбар, верхняя панель, нижняя навигация

- **Этап:** 01 Каркас приложения и дизайн-система
- **Статус:** ☐ не начата

## Контекст (прочитать перед началом)
- docs/02-architecture/routing.md (Навигация)

## Что сделать
1. Установить lucide-react
2. Sidebar (≥1024px) с активным пунктом, TopBar (заголовок, заглушки стрика/XP/уровня, переключатель темы)
3. BottomNav (<1024px) 5 пунктов + Sheet «Ещё»
4. Футер с коротким дисклеймером и ссылкой «О курсе»
5. Учесть safe-area на мобильных

## Файлы
- `src/app/layout/AppShell.tsx`
- `src/app/layout/Sidebar.tsx`
- `src/app/layout/TopBar.tsx`
- `src/app/layout/BottomNav.tsx`

## Критерии приёмки
- [ ] 375px: нет горизонтального скролла
- [ ] Активный раздел подсвечен
- [ ] Навигация с клавиатуры
- [ ] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(app): add responsive app shell navigation`
