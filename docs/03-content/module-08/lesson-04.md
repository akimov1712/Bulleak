# m08-l04 · Ликвидация

- **Модуль:** 8   **Время:** ~12 мин   **Практика:** CalcEmbed liquidation
- **Статус:** ☑ бриф ☑ текст ☑ визуалы ☑ тест ☑ проверен в браузере

## Цели
1. Понимать, что такое ликвидация и когда она происходит (маржа < поддерживающей).
2. Считать приблизительную цену ликвидации для изолированной позиции.
3. Следовать правилу: **стоп всегда значительно ближе к входу, чем ликвидация**.

## Ключевые тезисы
- Упрощённо long: `liq ≈ entry × (1 − 1/lev + mmr)`.
- При 10x ликвидация ≈ −9.5% от входа (mmr 0.5% — сверить для BTCUSDT); при 50x ≈ −1.5%.
- Ликвидация = потеря маржи позиции + комиссия ликвидации (сверить).
- Каскады ликвидаций (связь с m06-l03).
- Проверка перед сделкой: расстояние до стопа < ½ расстояния до ликвидации.

## Визуалы
- Diagram `liquidation-ladder` — плечо vs расстояние до ликвидации.
- CalcEmbed `liquidation`.

## Идеи вопросов теста
- [numeric] Long, entry 60 000, 10x, mmr 0.5% → liq (≈ 54 300, tolerance 100).
- [single] Когда происходит ликвидация.
- [truefalse] Стоп дальше ликвидации — нормально — неверно.
- [single] Что теряешь при ликвидации изолированной позиции.
- [numeric] Примерное расстояние до ликвидации при 20x (≈ 4.5%, tolerance 0.3).
- [single] Почему точную цену смотреть в Bybit.
- [single] Правило курса.
- [multi] Как снизить риск ликвидации.

## Термины
`liquidation`, `liquidation-price`, `maintenance-margin-rate`, `liquidation-cascade`

## Источники
Сверено 2026-09-28:
- Формула цены ликвидации (изолированная маржа, UTA) и MMR BTCUSDT 0,5 % — lib/trading/liquidation.ts; https://www.bybit.com/en/help-center/article/Liquidation-Price-Calculation-under-Isolated-Mode-Unified-Trading-Account
- Закрытие по цене банкротства, остаток в страховой фонд: https://www.bybit.com/en/help-center/article/Bankruptcy-Price-Perpetual-and-Expiry-Contracts , https://www.bybit.com/en/help-center/article/Insurance-Fund
- Пример по данным Bybit BTCUSDT 4H: 10.10.2025 20:00 UTC — O 116 606,5, L 101 045,9, C 112 732,5, объём ×9,7; ликвидация лонга от 116 000: 10x ≈ 104 980, 5x ≈ 93 380 (без комиссии).

## Связи
Готовит к: M9.
