/**
 * «Что это значит и что дальше» under calculator results (docs/04-features/hints.md, section 7).
 * Explains the numbers against the course rules; never says to buy or sell.
 */
import { formatNumber } from '@/lib/format';

const pct = (v: number, d = 1) => `${formatNumber(v, d)} %`;

export function positionAdvice(input: {
  riskPct: number;
  margin: number;
  balance: number;
}): string {
  const parts: string[] = [];
  parts.push(
    input.riskPct > 1
      ? `Риск ${pct(input.riskPct)} больше правила курса (1 %). Уменьши риск в процентах — стоп при этом двигать ближе ко входу не стоит, он должен стоять за структурой.`
      : `Риск ${pct(input.riskPct)} в пределах правила курса. Объём посчитан так, что при стопе ты теряешь именно эту долю счёта.`,
  );
  if (input.margin > input.balance) {
    parts.push(
      'Маржи не хватает: нужно плечо побольше — риск от этого не меняется, он задан стопом.',
    );
  }
  return parts.join(' ');
}

export function liquidationAdvice(input: {
  distancePct: number;
  stopBeyondLiquidation: boolean;
}): string {
  if (input.stopBeyondLiquidation) {
    return 'Стоп дальше цены ликвидации: позиция будет ликвидирована раньше, чем сработает стоп. Уменьши плечо, чтобы ликвидация ушла за стоп.';
  }
  if (input.distancePct < 5) {
    return `До ликвидации всего ${pct(input.distancePct)}: обычное колебание крипты может её достать. Чем меньше плечо, тем дальше ликвидация.`;
  }
  return `До ликвидации ${pct(input.distancePct)}. Главное — чтобы стоп стоял заметно ближе ко входу, чем ликвидация.`;
}

export function rrAdvice(input: { rr: number; breakevenWinrate: number }): string {
  const be = pct(input.breakevenWinrate * 100, 0);
  if (input.rr < 1) {
    return `R:R меньше 1: прибыль меньше риска, и выигрывать нужно больше ${be} сделок. Такие сделки курс советует пропускать.`;
  }
  if (input.rr < 1.5) {
    return `R:R ${formatNumber(input.rr, 2)} — ниже минимума курса 1,5. Безубыточность от ${be} побед; запас на ошибки маленький.`;
  }
  return `R:R ${formatNumber(input.rr, 2)}: даже при ${be} побед ты в нуле, всё сверху — плюс. Проверь, что тейк стоит у реального уровня, а не «для красивого числа».`;
}

export function expectancyAdvice(input: { expectancyR: number }): string {
  if (input.expectancyR <= 0) {
    return 'Матожидание не больше нуля: при этих цифрах система в среднем теряет. Меняется только винрейт или соотношение прибыли и убытка — не размер позиции.';
  }
  return `Матожидание +${formatNumber(input.expectancyR, 2)}R на сделку — это если твои цифры верны. Проверь их на 30+ сделках в журнале: оценки «на глаз» обычно слишком оптимистичны.`;
}

export function drawdownAdvice(input: { recoveryPct: number }): string {
  return `Чтобы отыграть такую просадку, нужно +${pct(input.recoveryPct, 0)}. Поэтому маленький риск на сделку важнее удачных входов: глубокую яму трудно засыпать.`;
}

export function feesAdvice(input: { feesShareOfRisk: number }): string {
  const share = pct(input.feesShareOfRisk * 100, 0);
  return input.feesShareOfRisk > 0.2
    ? `Комиссии — ${share} от риска сделки: это заметно портит R:R. Помогают лимитные ордера (maker) и сделки с более далёким стопом и меньшим объёмом.`
    : `Комиссии — ${share} от риска сделки: заметно, но не критично. Учитывай их в R:R.`;
}
