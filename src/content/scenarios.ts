/**
 * Simulator scenarios linked to lessons (simulator.md «Сценарии»). Each one is a fixed moment
 * of real Bybit history (BTCUSDT perpetual); the datasets are frozen (candles.test.ts), so the
 * indices below always point at the same candles. Levels checked against the data:
 * the textbook trades of the two trade scenarios reach their take profit before the stop.
 */
import type { SimDecision, SimScenario } from '@/types/trading';

export const SCENARIOS: readonly SimScenario[] = [
  {
    id: 'm03-sr-bounce',
    title: 'Отскок от поддержки',
    lessonId: 'm03-l04',
    dataset: 'BTCUSDT-240',
    startIndex: 2947,
    task: 'BTC дважды за два дня падал в зону 75 000–75 500, и оба раза покупатели выкупали падение. Последняя свеча — 16 сентября, 20:00 UTC. Входить в лонг от поддержки, в шорт или пропустить?',
    debrief:
      'По учебнику — лонг от поддержки. Зона 75 000–75 500 выдержала два теста, 16 сентября на втором тесте была длинная нижняя тень на объёме почти в 3 раза выше среднего — покупатели защищали уровень. Стоп — под зоной, около 74 700: если её пробьют, идея отменена. Цель — перед сопротивлением 79 000–79 600 (максимум 14 сентября). R:R около 1 : 1,9. Цена дошла до цели 18 сентября.',
    expected: 'long',
    ideal: { sl: 74_700, tp: 79_000 },
  },
  {
    id: 'm03-trend-pullback',
    title: 'Вход на откате по тренду',
    lessonId: 'm03-l03',
    dataset: 'BTCUSDT-240',
    startIndex: 2969,
    task: '18 сентября BTC пробил сопротивление 80 000 на большом объёме и сделал новый максимум. Сейчас цена откатила обратно к 80 000–80 500. Последняя свеча — 20 сентября, 12:00 UTC. Что делаешь?',
    debrief:
      'По учебнику — лонг на откате. Структура восходящая (HH/HL), а пробитое сопротивление 80 000 стало поддержкой: откат 20 сентября остановился на 80 100 — это новый HL. Стоп — под HL и уровнем, около 79 800. Цель — 84 000: R:R около 1 : 2,9. 21 сентября рост продолжился, цель достигнута.',
    expected: 'long',
    ideal: { sl: 79_800, tp: 84_000 },
  },
  {
    id: 'm03-range-middle',
    title: 'Середина диапазона',
    lessonId: 'm03-l04',
    dataset: 'BTCUSDT-240',
    startIndex: 2952,
    task: 'Цена третий день ходит между поддержкой 75 000–75 500 и сопротивлением около 78 000. Сейчас она ровно посередине, ~76 500. Последняя свеча — 17 сентября, 16:00 UTC. Входить?',
    debrief:
      'По учебнику — пропустить. Посередине диапазона нет ни уровня для стопа, ни места для цели: лонг со стопом под поддержкой (≈ 1 900 пунктов) и целью у сопротивления (≈ 1 400) даёт R:R хуже 1 : 1. Потом цена ушла вверх — но заранее этого знать было нельзя, а хорошие сделки начинаются от уровней. Пропуск — тоже решение.',
    expected: 'skip',
  },
];

export const getScenario = (id: string): SimScenario | undefined =>
  SCENARIOS.find((s) => s.id === id);

/** Was the learner's decision the textbook one? */
export const isDecisionCorrect = (scenario: SimScenario, decision: SimDecision): boolean =>
  scenario.expected === decision;
