# m08-l02 · Лонг и шорт

- **Модуль:** 8   **Время:** ~10 мин   **Практика:** Diagram, MiniQuiz
- **Статус:** ☑ бриф ☑ текст ☑ визуалы ☑ тест ☑ проверен в браузере

## Цели
1. Считать P&L лонга и шорта в USDT.
2. Понимать асимметрию шорта (теоретически неограниченный убыток без стопа).
3. Знать режимы позиции (one-way / hedge) — обзорно.

## Ключевые тезисы
- Long P&L = (exit − entry) × qty; Short P&L = (entry − exit) × qty.
- Шорт — нормальный инструмент в даунтренде, но рынок крипты исторически растёт → шорты требуют особой осторожности.
- One-way mode — рекомендуемый для новичка (сверить название).

## Визуалы
- Diagram `long-short-pnl`.

## Интерактив
- MiniQuiz с расчётами.

## Идеи вопросов теста
- [numeric] Лонг 0.1 BTC 60 000 → 63 000: P&L (300).
- [numeric] Шорт 2 ETH 3000 → 2800: P&L (400).
- [numeric] Шорт 1 SOL 150 → 165: P&L (−15).
- [single] Когда шорт зарабатывает.
- [truefalse] Убыток шорта без стопа ограничен — неверно.
- [single] Рекомендуемый режим позиции.
- [single] Формула P&L лонга.
- [single] Почему шорты в крипте рискованнее.

## Термины
`long`, `short`, `pnl`, `one-way-mode`, `hedge-mode`

## Связи
Готовит к: m08-l03.

## Источники
Сверено 2026-09-28:
- Режимы позиции One-Way / Hedge и условие переключения: https://www.bybit.com/en/help-center/article/Difference-Between-Position-Modes-One-Way-Mode-and-Hedge-Mode
- P&L линейного контракта: https://www.bybit.com/en/help-center/article/Profit-Loss-calculations-USDT-Contract
