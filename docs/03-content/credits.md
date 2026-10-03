# Источники изображений

Каждая внешняя картинка на сайте. Собственные SVG-схемы, макеты и графики из данных сюда не вносятся.
Сайт для личного пользования; источники записываются, чтобы картинку можно было найти или заменить.

| Файл | Источник (URL) | Лицензия (если известна) | Дата |
|---|---|---|---|
| — | — | — | — |

## Данные и библиотеки
- Исторические свечи: публичный API Bybit (`/v5/market/kline`).
- Графики: TradingView Lightweight Charts™ v5 (Apache-2.0), Copyright (c) 2025 TradingView, Inc. Атрибуция по лицензии — логотип TradingView со ссылкой на каждом графике (`attributionLogo: true`) и ссылка на странице «О курсе».

## Обложки модулей
- Все 13 обложек — собственные SVG-иллюстрации (`src/components/covers/ModuleCover.tsx`), без сторонних изображений. Решение 2026-09-26: вместо фото — рисованные обложки в стиле сайта (работают офлайн, одинаковы в обеих темах).
- Фото, отложенные из уроков m00-l01 (обложка модуля) и m01-l01 (монета биткоина), не нужны: их роль выполняют обложки и схемы.

## Скриншоты Bybit
Снимки собственные, сделаны скриптом `scripts/bybit-shots.ts` с публичной тестовой сети Bybit (интерфейс как на bybit.com). Интерфейс © Bybit; используются для обучения в личном курсе (`license: unknown` — пересмотреть при публичном запуске).

| Файл | Страница | Дата |
|---|---|---|
| `public/img/bybit/terminal.webp` | https://testnet.bybit.com/ru-RU/trade/usdt/BTCUSDT | 2026-10-03 |
| `public/img/bybit/contract-data.webp` | https://testnet.bybit.com/ru-RU/trade/usdt/BTCUSDT (панель «Данные контракта», развёрнута) | 2026-10-03 |
| `public/img/bybit/funding-bar.webp` | https://testnet.bybit.com/ru-RU/trade/usdt/BTCUSDT (строка над графиком) | 2026-10-03 |
| `public/img/bybit/contract-detail.webp` | https://testnet.bybit.com/ru-RU/announcement-info/contract-detail | 2026-10-03 |
| `public/img/bybit/order-form.webp` | https://www.bybit.com/ru-RU/trade/usdt/BTCUSDT — аккаунт пользователя, форма ордера с TP/SL | 2026-10-03 |
| `public/img/bybit/leverage.webp` | то же, список плеча | 2026-10-03 |
| `public/img/bybit/margin-mode.webp` | то же, меню режима маржи | 2026-10-03 |
| `public/img/bybit/security.webp`, `security-advanced.webp` | https://www.bybit.com/ru-RU/app/user/security — e-mail заменён точками | 2026-10-03 |
| `public/img/bybit/assets.webp` | https://www.bybit.com/ru-RU/user/assets/home/overview — суммы скрыты самим Bybit | 2026-10-03 |
| `public/img/bybit/deposit-network.webp` | https://www.bybit.com/ru-RU/user/assets/deposit — USDT, список сетей; адрес не открывался | 2026-10-03 |

