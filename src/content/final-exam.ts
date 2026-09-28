/**
 * Final exam (exams-certificate.md): a theory part drawn from every module exam — the pool is
 * all module exam questions, 40 per attempt spread across topics, pass 85 % — and a practical
 * part of three real chart moments graded by lib/quiz/practical (decision, not outcome).
 */
import type { Quiz } from '@/types/quiz';
import type { SimDecision } from '@/types/trading';

type ExamModule = { exam: Quiz };

const moduleExams = Object.entries(
  import.meta.glob<ExamModule>('./modules/*/exam.ts', { eager: true }),
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, m]) => m.exam);

export const finalExam: Quiz = {
  id: 'final',
  kind: 'exam',
  passRatio: 0.85,
  sample: 40,
  questions: moduleExams.flatMap((e) => e.questions),
};

export interface PracticalScenario {
  id: string;
  title: string;
  /** Dataset name, e.g. "ETHUSDT-60". */
  dataset: string;
  /** Decision candle: history up to and including it is shown; entry = its close. */
  startIndex: number;
  task: string;
  expected: SimDecision;
  /** Textbook reading, shown after the exam. */
  debrief: string;
}

export const PRACTICAL_SCENARIOS: readonly PracticalScenario[] = [
  {
    id: 'final-p1',
    title: 'ETH, август 2026',
    dataset: 'ETHUSDT-60',
    startIndex: 1708,
    task: 'ETHUSDT. Дневное закрытие 1 844 — ниже EMA 200 (около 2 166), структура LH/LL. Импульс на 4H: падение с 1 936,7 (30 июля) до 1 820,6 (1 августа). Откат поднялся до 1 898: Фибо 0,5–0,618 импульса — 1 879–1 892, рядом EMA 50 на 4H (около 1 885) и флип-уровень около 1 873. ATR(14) на 4H — около 24. Последняя свеча 1H — 2 августа, 22:00 UTC.',
    expected: 'short',
    debrief:
      'По TPS — шорт. Контекст медвежий, в зоне совпали все три фактора, триггер — медвежье поглощение: свеча 22:00 закрылась на 1 881, ниже открытия предыдущей зелёной. Учебный стоп — над максимумом отката 1 898 плюс 0,5 ATR (около 12): около 1 910. Цель — минимум импульса 1 820,6: R:R около 1 : 2,1. Эта сделка по плану закончилась стопом 5 августа — но оценивается решение, а не результат.',
  },
  {
    id: 'final-p2',
    title: 'SOL, сентябрь 2026',
    dataset: 'SOLUSDT-60',
    startIndex: 2577,
    task: 'SOLUSDT. Дневное закрытие 103,73 — выше EMA 200 (около 91), последний слом структуры вверх. Импульс на 4H: рост со 100,01 (4 сентября) до 107,32 (6 сентября). Откат опустился до 102,62: Фибо 0,5–0,618 импульса — 102,80–103,66, рядом EMA 50 на 4H и флип-уровень около 103. ATR(14) на 4H — около 1,8. Последняя свеча 1H — 8 сентября, 03:00 UTC: длинная нижняя тень, закрытие 103,28.',
    expected: 'long',
    debrief:
      'По TPS — лонг. Контекст бычий, три фактора в зоне, триггер — бычий пин-бар: длинная нижняя тень и закрытие у максимума свечи. Учебный стоп — под минимумом 102,62 минус 0,5 ATR (около 0,9): около 101,7. Цель — максимум импульса 107,32: R:R около 1 : 2,6. В тот же день цена выбила стоп — и это снова не ошибка решения.',
  },
  {
    id: 'final-p3',
    title: 'ETH, 21 сентября 2026',
    dataset: 'ETHUSDT-60',
    startIndex: 2906,
    task: 'ETHUSDT. Дневной тренд вверх: закрытие 2 775, EMA 200 около 2 227. За четыре дня ETH вырос примерно с 2 450 до 2 807. Последняя свеча 1H — 21 сентября, 20:00 UTC — обновила максимум (2 806,9) и закрылась на 2 783. Отката к зоне пока не было.',
    expected: 'skip',
    debrief:
      'По TPS — пропустить. Контекст бычий, но цена у самого максимума импульса: нет отката в зону и нет триггера. Вход здесь — погоня за движением, то есть FOMO. Правильно — отметить зону Фибо 0,5–0,618 нового импульса и поставить алерт. Через два дня ETH откатил до 2 633.',
  },
];
