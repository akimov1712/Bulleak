# Формат тестов

Типы — в `docs/02-architecture/data-model.md`, поведение — в `docs/04-features/quiz-engine.md`.

## Файл теста урока
```ts
// src/content/modules/m09/l02/quiz.ts
import type { Quiz } from '@/types/quiz';

export const quiz: Quiz = {
  id: 'm09-l02',
  kind: 'lesson',
  passRatio: 0.8,
  questions: [
    {
      id: 'm09-l02-q1',
      type: 'numeric',
      prompt: 'Депозит $1000, риск 1%, вход 60 000, стоп 59 000. Какой размер позиции в BTC?',
      correct: 0.01,
      tolerance: 0.0005,
      unit: 'BTC',
      explanation: 'Риск = $10. Расстояние до стопа = $1000. 10 / 1000 = 0.01 BTC. Частая ошибка — поделить депозит на цену.',
      tags: ['position-size'],
    },
    {
      id: 'm09-l02-q2',
      type: 'single',
      prompt: 'Что определяется первым?',
      options: [
        { id: 'a', text: 'Место стопа по структуре' },
        { id: 'b', text: 'Размер позиции' },
        { id: 'c', text: 'Плечо' },
      ],
      correct: 'a',
      explanation: '…',
      tags: ['position-size', 'stop-loss'],
    },
  ],
};
```

## Правила
- id вопроса: `<lessonId>-q<N>`; для экзамена `<moduleId>-ex-q<N>`.
- `tags` — id терминов глоссария или тем (для статистики слабых мест); 1–3 тега.
- numeric: `tolerance` учитывает округление; в prompt явно указать единицы/точность («округли до сотых»).
- chart-click: `from`/`to` ≤ 150 свечей; целевой диапазон с запасом (не требовать пиксельной точности).
- match: 3–5 пар. order: 3–6 элементов.
- Экзамен модуля: пул 20–30, `sample: 15`, вопросы новые (не копия тестов уроков), больше задач на применение.
- Финальный: пул ≥ 60, `sample: 40`, `passRatio: 0.85`.
