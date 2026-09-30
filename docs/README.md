# Карта ТЗ

Это техническое задание, по которому строится сайт-курс. Каждая сессия начинается здесь.

## Как ориентироваться
| Нужно… | Смотри |
|---|---|
| Продолжить на новом компьютере | [ONBOARDING.md](ONBOARDING.md) |
| Понять, где остановились | [PROGRESS.md](PROGRESS.md) |
| Зачем проект, для кого, принципы | [00-vision.md](00-vision.md) |
| Правила кода, git, тестов, ревью, контента | [01-rules/](01-rules/) |
| Архитектура, стек, модель данных | [02-architecture/](02-architecture/) |
| Что писать в уроках | [03-content/](03-content/) |
| Как должна работать каждая фича | [04-features/](04-features/) |
| Конкретные микрозадачи | [05-tasks/](05-tasks/) |
| Тест-план, баги, ревью | [06-qa/](06-qa/) |

## 01-rules
- [coding-standards.md](01-rules/coding-standards.md) — стиль кода, структура компонентов
- [git-workflow.md](01-rules/git-workflow.md) — коммиты, ветки
- [testing-policy.md](01-rules/testing-policy.md) — что и как тестировать
- [definition-of-done.md](01-rules/definition-of-done.md) — когда задача готова
- [code-review-checklist.md](01-rules/code-review-checklist.md) — чек-лист ревью этапа
- [content-guidelines.md](01-rules/content-guidelines.md) — как писать уроки и тесты
- [image-sourcing.md](01-rules/image-sourcing.md) — откуда брать картинки

## 02-architecture
- [stack.md](02-architecture/stack.md) — технологии и версии
- [folder-structure.md](02-architecture/folder-structure.md) — структура репозитория
- [data-model.md](02-architecture/data-model.md) — типы: курс, урок, тест, прогресс, сделки
- [storage.md](02-architecture/storage.md) — localStorage / IndexedDB, миграции, экспорт
- [routing.md](02-architecture/routing.md) — страницы и URL
- [content-pipeline.md](02-architecture/content-pipeline.md) — MDX, метаданные, тесты уроков
- [design-system.md](02-architecture/design-system.md) — цвета, типографика, компоненты, маскот
- [market-data.md](02-architecture/market-data.md) — загрузка свечей Bybit

## 03-content
- [content-plan.md](03-content/content-plan.md) — все модули и уроки
- `module-XX/lesson-YY.md` — брифы уроков
- [quiz-spec.md](03-content/quiz-spec.md) — формат вопросов
- [glossary-list.md](03-content/glossary-list.md) — термины глоссария
- [achievements-list.md](03-content/achievements-list.md) — достижения
- [credits.md](03-content/credits.md) — источники изображений
- [bybit-mockups.md](03-content/bybit-mockups.md) — SVG-макеты экранов Bybit (вместо скриншотов)

## 04-features
[path-map](04-features/path-map.md) · [lesson-player](04-features/lesson-player.md) · [quiz-engine](04-features/quiz-engine.md) · [gamification](04-features/gamification.md) · [stats](04-features/stats.md) · [simulator](04-features/simulator.md) · [calculators](04-features/calculators.md) · [journal](04-features/journal.md) · [glossary](04-features/glossary.md) · [settings-export](04-features/settings-export.md) · [exams-certificate](04-features/exams-certificate.md) · [**accounts-backend**](04-features/accounts-backend.md) (аккаунты и бэкенд, этапы 13–16)

## 05-tasks
[05-tasks/README.md](05-tasks/README.md) — обзор. Этапы 00–10, в каждой папке `README.md` с целью этапа и списком задач `T-XXX-*.md`.
Нумерация: `T-<этап><номер>`, например `T-203` — третья задача этапа 2 (этап 10 — `T-10NN`).

## 06-qa
[test-plan.md](06-qa/test-plan.md) · [bug-log.md](06-qa/bug-log.md) · [review-log.md](06-qa/review-log.md)

## Шаблоны
[lesson-brief-template.md](03-content/lesson-brief-template.md)
