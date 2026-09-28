# T-813 · Урок m11-l01: Из чего состоит стратегия

- **Этап:** 08 Контент: модули 9–12, финал, сертификат
- **Статус:** ☑ готово

## Контекст (прочитать перед началом)
- docs/03-content/module-11/lesson-01.md (бриф — главный источник)
- docs/01-rules/content-guidelines.md
- docs/03-content/quiz-spec.md
- docs/01-rules/image-sourcing.md

## Что сделать
1. Сверить факты из брифа с источниками (WebSearch/WebFetch), записать URL и дату в раздел «Источники» брифа
2. Написать src/content/modules/m11/l01/index.mdx по структуре content-guidelines.md (Goals → теория с визуалами → интерактив → Summary)
3. Сделать визуалы из брифа: новые SVG-схемы в src/components/diagrams, разметка графиков, фото/картинки и макеты Bybit (bybit-mockups.md) с записью источника в credits.md
4. Написать src/content/modules/m11/l01/quiz.ts: 8–12 вопросов по идеям брифа, объяснения к каждому
5. Добавить определения всех терминов урока в src/content/glossary.ts (short + full)
6. Пройти урок и тест в браузере целиком (1280 и 375, обе темы), отметить статус в брифе

## Критерии приёмки
- [x] Все цели брифа раскрыты, объём 800–1800 слов
- [x] Минимум один интерактивный элемент
- [x] Тест 8–12 вопросов, ≥ 2 типа, `content.test.ts` зелёный
- [x] Нет обещаний прибыли; риски отмечены блоками Warning
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `content(m11): add lesson m11-l01`
