# m02-l01 · Регистрация, верификация и защита аккаунта

- **Модуль:** 2 Bybit с нуля   **Время:** ~10 мин   **Практика:** Steps, Checklist
- **Статус:** ☑ бриф ☑ текст ☑ визуалы ☑ тест ☑ проверен в браузере

## Цели
1. Зарегистрироваться на Bybit только через официальный сайт/приложение.
2. Понимать уровни верификации (KYC) и зачем они нужны.
3. Настроить защиту: 2FA, антифишинговый код, пароль вывода/белый список, уведомления о входе.

## Ключевые тезисы
- Проверка домена, приложение только из официальных магазинов.
- Доступность Bybit зависит от страны: проверить правила своей юрисдикции (Bybit не работает в ряде стран — сверить список на Help Center). Курс не помогает обходить ограничения.
- KYC-уровни и лимиты (сверить актуальные).
- Пошагово: регистрация → 2FA → антифишинговый код → настройки вывода → устройства.
- Субаккаунт для обучения — опционально (сверить наличие функции).

## Визуалы
- Steps с 5–7 шагами; SVG-макеты BybitSecurity и BybitKycLevels (bybit-mockups.md).
- Checklist «Аккаунт защищён».

## Идеи вопросов теста
- [order] Порядок настройки безопасности.
- [single] Зачем KYC.
- [truefalse] Скачивать приложение из ссылки в Telegram-канале нормально — неверно.
- [single] Что делать, если пришло уведомление о входе не от тебя.
- [multi] Что входит в защиту аккаунта.
- [single] Где проверять доступность сервиса в своей стране.
- [single] Что такое антифишинговый код (повтор из m01-l05, закрепление).
- [truefalse] Одинаковый пароль для почты и биржи — допустимо — неверно.

## Термины
`kyc`, `2fa`, `anti-phishing-code`, `subaccount`

## Источники
Сверено 2026-09-26:
- Bybit Help Center, «Benefits of Different Verification (KYC) Levels» и «FAQ — Individual KYC» — уровни Standard (документ + лицо), Advanced (адрес, документ ≤ 3 мес.), Pro (доход); лимит вывода Standard 1 млн USDT/день, Advanced/Pro 2 млн USDT/день; проверка ~15 мин, до 48 ч: https://www.bybit.com/en/help-center/article/Benefits-of-Different-KYC-Levels ; https://www.bybit.com/en/help-center/article/Individual-KYC-FAQ
- Bybit Help Center, «Service Restricted Countries» (список меняется — в уроке ссылка, без перечисления): https://www.bybit.com/en/help-center/article/Service-Restricted-Countries
- Bybit Help Center, «FAQ — Standard Subaccount» — до 5 обычных субаккаунтов (VIP/бизнес — 20), без платы: https://www.bybit.com/en/help-center/article/FAQ-Standard-Subaccount
- Bybit Help Center, «How to Enhance the Security of Your Account» и «How to Activate/Remove Secure Transaction Approval» — Google Authenticator, антифишинговый код, основное устройство для подтверждения выводов: https://www.bybit.com/en/help-center/article/How-to-Enhance-Your-Account-Security ; https://www.bybit.com/en/help-center/article/How-to-Activate-Remove-Secure-Transaction-Approval

## Заметки
- Самостоятельная блокировка аккаунта в настройках не подтверждена источником — в тексте «попросить поддержку заблокировать аккаунт».
- Макеты BybitSecurity и BybitKycLevels сделаны HTML-карточками (см. bybit-mockups.md).

## Связи
Опирается на: m01-l05 · Готовит к: m02-l02.
