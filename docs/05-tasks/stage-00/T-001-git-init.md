# T-001 · Инициализировать git и закоммитить ТЗ

- **Этап:** 00 Среда разработки
- **Статус:** ☑ выполнена

## Контекст (прочитать перед началом)
- docs/01-rules/git-workflow.md

## Что сделать
1. `git init -b main`
2. Создать `.gitignore` (node_modules, dist, coverage, playwright-report, test-results, .env*, *.log, .DS_Store)
3. Создать `.gitattributes` с `* text=auto eol=lf`
4. Закоммитить CLAUDE.md и docs/

## Файлы
- `.gitignore`
- `.gitattributes`

## Критерии приёмки
- [x] `git log` показывает первый коммит с ТЗ
- [x] Рабочее дерево чистое
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `docs: add project specification and rules`
