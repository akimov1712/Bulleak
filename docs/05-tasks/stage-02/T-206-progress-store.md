# T-206 · Стор прогресса с persist и миграциями

- **Этап:** 02 Движок уроков и тестов
- **Статус:** ☑ выполнена

## Контекст (прочитать перед началом)
- docs/02-architecture/storage.md
- docs/02-architecture/data-model.md (ProgressState)

## Что сделать
1. src/store/progressStore.ts: ProgressState, persist `tc-progress`, version 1, migrate из lib/progress/migrate.ts
2. Действия: markRead, recordQuiz, addTime (логика в lib, стор только вызывает)
3. Синхронизация вкладок (storage event → rehydrate)
4. Баннер «прогресс не сохраняется» при ошибке storage

## Файлы
- `src/store/progressStore.ts`
- `src/lib/progress/migrate.ts`
- `src/lib/progress/initial.ts`

## Критерии приёмки
- [x] Тест migrate (v0 → v1 заглушка, неизвестная форма → initial)
- [x] Две вкладки видят изменения друг друга
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(store): add persisted progress store`
