# T-714 · Урок m05-l06: Ловушки индикаторов

- **Этап:** 07 Контент: модули 4–8
- **Статус:** ☐ не начата

## Контекст (прочитать перед началом)
- docs/03-content/module-05/lesson-06.md (бриф — главный источник)
- docs/01-rules/content-guidelines.md
- docs/03-content/quiz-spec.md
- docs/01-rules/image-sourcing.md

## Что сделать
1. Сверить факты из брифа с источниками (WebSearch/WebFetch), записать URL и дату в раздел «Источники» брифа
2. Написать src/content/modules/m05/l06/index.mdx по структуре content-guidelines.md (Goals → теория с визуалами → интерактив → Summary)
3. Сделать визуалы из брифа: новые SVG-схемы в src/components/diagrams, разметка графиков, фото/картинки и макеты Bybit (bybit-mockups.md) с записью источника в credits.md
4. Написать src/content/modules/m05/l06/quiz.ts: 8–12 вопросов по идеям брифа, объяснения к каждому
5. Добавить определения всех терминов урока в src/content/glossary.ts (short + full)
6. Пройти урок и тест в браузере целиком (1280 и 375, обе темы), отметить статус в брифе

## Критерии приёмки
- [ ] Все цели брифа раскрыты, объём 800–1800 слов
- [ ] Минимум один интерактивный элемент
- [ ] Тест 8–12 вопросов, ≥ 2 типа, `content.test.ts` зелёный
- [ ] Нет обещаний прибыли; риски отмечены блоками Warning
- [ ] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `content(m05): add lesson m05-l06`
