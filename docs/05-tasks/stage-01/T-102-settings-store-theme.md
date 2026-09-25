# T-102 · Стор настроек и переключение темы

- **Этап:** 01 Каркас приложения и дизайн-система
- **Статус:** ☐ не начата

## Контекст (прочитать перед началом)
- docs/02-architecture/storage.md
- docs/02-architecture/data-model.md (Settings)

## Что сделать
1. Установить zustand
2. src/store/settingsStore.ts с persist (`tc-settings`), тип Settings
3. Хук useApplyTheme: пишет data-theme на html, слушает prefers-color-scheme при `system`
4. Хук useReducedMotion с учётом настройки
5. Безопасная обёртка storage (try/catch) в src/store/safeStorage.ts

## Файлы
- `src/store/settingsStore.ts`
- `src/store/safeStorage.ts`
- `src/hooks/useApplyTheme.ts`
- `src/hooks/useReducedMotion.ts`

## Критерии приёмки
- [ ] Тема сохраняется после перезагрузки
- [ ] Режим system реагирует на смену системной темы
- [ ] Тест safeStorage при исключении localStorage
- [ ] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(settings): add settings store with theme switching`
