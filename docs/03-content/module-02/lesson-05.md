# m02-l05 · Типы ордеров: рыночный, лимитный, условный, TP/SL

- **Модуль:** 2   **Время:** ~14 мин   **Практика:** Diagram ордеров
- **Статус:** ☑ бриф ☑ текст ☑ визуалы ☑ тест ☑ проверен в браузере

## Цели
1. Различать рыночный и лимитный ордер, maker и taker.
2. Понимать условные (conditional/stop) ордера и триггерную цену.
3. Ставить TP/SL при открытии и к открытой позиции; понимать Post-Only, Reduce-Only, TIF (GTC/IOC/FOK) — обзорно.

## Ключевые тезисы
- Market — немедленно, по лучшим ценам стакана, taker, возможное проскальзывание.
- Limit — по твоей цене или лучше, может не исполниться; обычно maker.
- Conditional: при достижении trigger-цены выставляется market/limit ордер.
- Stop Loss / Take Profit: встроенные в позицию; триггер по Last/Mark price (сверить на Bybit).
- Reduce-Only — ордер только уменьшает позицию. Post-Only — гарантирует maker.
- Типичные ошибки: лимит на покупку выше рынка = исполнится сразу; стоп не выставлен; стоп слишком близко.

## Визуалы
- Diagram `order-types` — ценовая шкала с текущей ценой, лимит ниже, стоп-покупка выше, TP/SL.
- Интерактивная схема: перетаскиваешь цену → видно, какие ордера срабатывают.

## Идеи вопросов теста
- [single] Какой ордер гарантирует исполнение (market).
- [single] Хочешь купить BTC дешевле текущей цены — какой ордер (limit).
- [single] Что такое trigger price.
- [truefalse] Лимит-ордер всегда исполняется — неверно.
- [single] Maker vs taker.
- [single] Что делает Reduce-Only.
- [match] TIF: GTC/IOC/FOK ↔ поведение.
- [single] Ты в лонге от 60 000, хочешь ограничить убыток на 58 500 — что поставить (SL).
- [multi] Ошибки с ордерами.

## Термины
`market-order`, `limit-order`, `conditional-order`, `trigger-price`, `stop-loss`, `take-profit`, `maker`, `taker`, `reduce-only`, `post-only`, `time-in-force`, `mark-price`

## Источники
Сверено 2026-09-26:
- Bybit Help Center, «Types of Orders Available on Bybit» — рыночный, лимитный, условный (conditional market / conditional limit), триггер по Last / Mark / Index: https://www.bybit.com/en/help-center/article/Types-of-Orders-Available-on-Bybit
- Bybit Help Center, «How to Set Up and Modify Your TP/SL (Perpetual and Futures Contracts)» — TP/SL при открытии и к позиции, базовая цена Last / Index / Mark: https://www.bybit.com/en/help-center/article/How-to-Set-Up-and-Modify-TP-SL-Perpetual-Futures-Contracts
- Bybit Help Center, «Time In Force Selections (GTC, IOC, FOK)», «Post-Only Order», «Reduce-Only Order»: https://www.bybit.com/en/help-center/article/What-Are-Time-In-Force-TIF-GTC-IOC-FOK ; https://www.bybit.com/en/help-center/article/Post-Only-Order ; https://www.bybit.com/en/help-center/article/Reduce-Only-Order

## Заметки
- Макет BybitOrderForm: `bybit-ui-order-form`. Интерактивная схема order-types (срабатывание при касании уровня) — из T-406.
- Markdown-списки внутри JSX-блоков пишутся с пустыми строками вокруг, иначе Prettier склеивает их в абзац.

## Связи
Опирается на: m01-l03 · Готовит к: m02-l06, M9.
