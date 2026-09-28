# m09-l03 · R:R, винрейт и матожидание

- **Модуль:** 9   **Время:** ~13 мин   **Практика:** CalcEmbed rr, expectancy
- **Статус:** ☑ бриф ☑ текст ☑ визуалы ☑ тест ☑ проверен в браузере

## Цели
1. Выражать результаты в R (единица риска).
2. Считать безубыточный винрейт для заданного R:R.
3. Считать матожидание стратегии и понимать, что прибыльность = винрейт × R:R.

## Ключевые тезисы
- 1R = сумма риска сделки. Результат +2R = заработал 2 риска.
- Break-even winrate = 1 / (1 + RR): при 1:2 → 33.3%.
- Матожидание E = W × avgWin − (1 − W) × avgLoss (в R).
- Высокий винрейт с плохим R:R может быть убыточным и наоборот.
- R:R фиксируется до входа, «сдвигать тейк ближе от страха» — портит статистику.

## Визуалы
- Diagram `rr-winrate-matrix` — тепловая карта прибыльности.
- CalcEmbed `rr`, `expectancy`.

## Идеи вопросов теста
- [numeric] RR 1:3 → безубыточный винрейт (25).
- [numeric] W=40%, win 2R, loss 1R → E (0.2).
- [numeric] Риск $50, прибыль $150 → R (3).
- [single] Что такое 1R.
- [truefalse] Винрейт 70% всегда прибыльный — неверно.
- [single] Почему нельзя двигать тейк ближе.
- [numeric] E=0.25R, 20 сделок/мес, риск 1% → ожидание % (5).
- [single] Что важнее: винрейт или матожидание.

## Термины
`risk-reward`, `r-multiple`, `winrate`, `expectancy`, `breakeven-winrate`

## Источники
Сверено 2026-09-28:
- Матожидание в R (E = W × средняя прибыль − (1 − W) × средний убыток), R-множитель как результат ÷ риск: https://www.pnlledger.com/expectancy-r-multiples-the-plain-english-guide/
- Безубыточный винрейт (L + C) ÷ (W + L), при 2:1 — 33,3 %: https://traderssecondbrain.com/guides/expectancy-formula , https://www.luxalgo.com/blog/win-rate-and-riskreward-connection-explained/
- Формулы совпадают с lib/trading/rr.ts (breakevenWinrate, expectancy — покрыты unit-тестами).

## Связи
Готовит к: m11-l05.
