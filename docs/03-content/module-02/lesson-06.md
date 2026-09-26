# m02-l06 · Комиссии maker/taker, демо-торговля и тестнет

- **Модуль:** 2   **Время:** ~11 мин   **Практика:** CalcEmbed fees
- **Статус:** ☑ бриф ☑ текст ☑ визуалы ☑ тест ☑ проверен в браузере

## Цели
1. Знать структуру комиссий Bybit (спот, деривативы, maker/taker, VIP-уровни) — с актуальными цифрами на дату.
2. Считать комиссию сделки и её долю от риска.
3. Знать, как пользоваться демо-торговлей Bybit и тестнетом, и чем они отличаются.

## Ключевые тезисы
- Комиссия считается от **объёма позиции** (номинала), а не от маржи → с плечом комиссия относительно депозита растёт.
- Вход + выход = 2 комиссии. Taker дороже maker.
- Пример: позиция $5000, taker 0.055% (сверить) → $2.75 на вход, $2.75 на выход.
- Демо-торговля (Demo Trading) в основном аккаунте и тестнет (testnet.bybit.com) — сверить актуальные возможности, как получить тестовые средства.
- Правило курса: вся практика до модуля 12 — на демо/тестнете.

## Визуалы
- Таблица комиссий (с датой сверки и ссылкой).
- CalcEmbed `fees`.
- Steps: как открыть демо-торговлю.

## Идеи вопросов теста
- [numeric] Комиссия taker 0.055% на позицию $2000 (вход) = $1.10.
- [single] От чего считается комиссия (от номинала).
- [truefalse] Maker-комиссия обычно ниже taker — верно.
- [numeric] Полная комиссия за вход и выход по $10 000 при 0.055% = $11.
- [single] Для чего демо-торговля.
- [single] Как стать maker (лимит, не исполняющийся сразу / Post-Only).
- [single] Как плечо влияет на комиссию относительно депозита.
- [multi] Чем демо отличается от реала (нет проскальзывания эмоций, иные условия исполнения).

## Термины
`trading-fee`, `maker`, `taker`, `vip-level`, `demo-trading`, `testnet`, `notional-value`

## Источники
Сверено 2026-09-26:
- Bybit, «Bybit Trading Fees» и Help Center «Spot Trading: Fees Explained» — спот non-VIP 0,1% / 0,1%: https://www.bybit.com/en/announcement-info/fee-rate/ ; https://www.bybit.com/en/help-center/article/Bybit-Spot-Fees-Explained
- Бессрочные non-VIP 0,02% мейкер / 0,055% тейкер — официальная страница не открылась (таймаут), ставки подтверждены обзорами 2026 г.: https://bitsgap.com/blog/bybit-trading-fees-explained-what-it-costs ; https://www.bitdegree.org/crypto/tutorials/bybit-fees . В уроке и калькуляторе — пометка «ставки аккаунта смотри на странице комиссий Bybit».
- Bybit Learn, «How to Use Bybit Demo Trading (Step-By-Step)» и Help Center «FAQ — Demo Trading» — вход через иконку профиля → Demo Trading, метка в шапке, стартовые 50 000 USDT, 50 000 USDC, 1 BTC, 1 ETH, пополнение при балансе < 10 000 $, выход — Start Live Trading: https://learn.bybit.com/en/bybit-guide/how-to-use-bybit-demo-trading ; https://www.bybit.com/en/help-center/article/FAQ-Demo-Trading

## Заметки
- Калькулятор `fees` сделан заранее (из T-602): `lib/trading/fees.ts` + `features/calculators/FeesCalc.tsx`.
- Добавлен раздел «Сколько нужно пройти цене, чтобы выйти в ноль» (не было в брифе). Макет BybitDemo: `bybit-ui-demo`.

## Связи
Готовит к: M3, m08-l05, m11-l06.
