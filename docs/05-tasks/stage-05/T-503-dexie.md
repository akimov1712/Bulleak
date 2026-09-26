# T-503 · IndexedDB через Dexie

- **Этап:** 05 Тренажёр
- **Статус:** ✅ готово

## Контекст (прочитать перед началом)
- docs/02-architecture/storage.md

## Что сделать
1. Установить dexie, dexie-react-hooks, fake-indexeddb (dev)
2. src/db/db.ts: БД tc-db, таблицы simTrades и journal с индексами, версия 1
3. Репозитории simRepo/journalRepo (add, list, update, delete, clear)
4. Тесты с fake-indexeddb

## Файлы
- `src/db/db.ts`
- `src/db/simRepo.ts`
- `src/db/journalRepo.ts`

## Критерии приёмки
- [x] Ошибка IndexedDB не роняет приложение (сообщение пользователю)
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(db): add dexie database for trades`
