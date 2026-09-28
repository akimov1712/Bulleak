# m08-l01 · Что такое бессрочный фьючерс

- **Модуль:** 8 Фьючерсы и плечо   **Время:** ~11 мин   **Практика:** Compare
- **Статус:** ☑ бриф ☑ текст ☑ визуалы ☑ тест ☑ проверен в браузере

## Цели
1. Понимать фьючерс как контракт на цену без владения активом.
2. Знать отличие бессрочного (perpetual) от срочного фьючерса.
3. Понимать Mark Price, Index Price, Last Price.

## Ключевые тезисы
- Perpetual не истекает; цена удерживается около спота механизмом funding.
- USDT-маржинальные (linear) — P&L в USDT, проще для новичка; inverse — маржа в монете (обзорно).
- Last price — последняя сделка; Index — средняя по биржам; Mark — для расчёта P&L и ликвидаций (защищает от манипуляций).
- Размер контракта, минимальный объём, шаг цены — в спецификации контракта (сверить на Bybit для BTCUSDT).

## Визуалы
- Compare «Срочный vs Бессрочный».
- Diagram `price-types` (Last/Index/Mark).

## Идеи вопросов теста
- [single] Чем бессрочный отличается от срочного.
- [single] По какой цене считается ликвидация (Mark).
- [single] Что такое USDT-маржинальный контракт.
- [truefalse] Покупая perpetual, ты владеешь BTC — неверно.
- [match] Тип цены ↔ описание.
- [single] Как perpetual держится около спота (funding).
- [single] Где смотреть спецификацию контракта.
- [multi] Преимущества linear-контрактов для новичка.

## Термины
`perpetual`, `futures`, `mark-price`, `index-price`, `last-price`, `linear-contract`, `inverse-contract`

## Источники
Сверено 2026-09-28:
- Mark Price — индекс спотовых цен + затухающий базис funding; по Mark считаются нереализованный P&L и ликвидация (двухценовой механизм): https://www.bybit.com/en/help-center/article/Mark-Price-Calculation-Perpetual-Expiry-Contracts , https://www.bybit.com/en/help-center/article/Why-Was-My-Position-Still-Liquidated
- Выбор цены срабатывания TP/SL (Last/Mark/Index): https://learn.bybit.com/en/trading/last-price-vs-mark-price-in-futures
- Шаг цены BTCUSDT 0,1 и параметры контрактов: https://www.bybit.com/en/announcement-info/transact-parameters/ ; шаг объёма 0,001 BTC — как в тренажёре курса (src/lib/trading/simPlan.ts), сверить в торговых параметрах перед этапом 10.

## Связи
Опирается на: m02-l04.
