# Рыночные данные

## Источник
Публичный REST API Bybit v5, без ключей:
`GET https://api.bybit.com/v5/market/kline?category=linear&symbol=BTCUSDT&interval=240&start=<ms>&end=<ms>&limit=1000`
Ответ: `result.list` — массив `[startTime, open, high, low, close, volume, turnover]` строками, **от новых к старым**.
(Сверить формат с https://bybit-exchange.github.io/docs/v5/market/kline перед реализацией.)

## Скрипт `scripts/fetch-klines.ts` (`npm run data:fetch`)
- Наборы: `BTCUSDT`, `ETHUSDT`, `SOLUSDT` × интервалы `60` (1H), `240` (4H), `D` (1D).
- Глубина: 1H — 3000 свечей, 4H — 3000, 1D — весь доступный период (с 2020).
- Пагинация назад по `end`, пауза 200 мс между запросами, ретраи 3× с backoff.
- Сортировка по времени, дедупликация, проверка непрерывности (разрывы → предупреждение в логе).
- Формат файла `public/data/BTCUSDT-240.json`:
  ```json
  { "symbol": "BTCUSDT", "interval": "240", "fetchedAt": 1760000000000, "candles": [[t,o,h,l,c,v], ...] }
  ```
  Числа округлены до разумной точности (цены — как у инструмента, объём — 2 знака) для уменьшения размера.
- Файлы коммитятся в репозиторий: сборка и тесты не зависят от сети.
- Если API недоступен (гео-блок, ошибка) — скрипт завершает с понятной ошибкой, старые файлы не трогает. Запасной вариант: ручная выгрузка CSV с Bybit и конвертер `--from-csv`.

## Загрузка в приложении
- `features/charts/useDataset(name)` — `fetch('data/<name>.json')` с кэшем в памяти (Map), `Suspense`-friendly.
- Конвертация в `Candle[]` в `lib/trading/candles.ts`, тесты.

## Индикаторы
Считаются локально в `lib/indicators/` (SMA, EMA, RSI, MACD, Bollinger, ATR) — чистые функции с тестами на известных значениях. Отображаются через lightweight-charts line/histogram series.
