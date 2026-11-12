# Хостинг

## Сейчас
| Что | Где |
|---|---|
| Сайт | https://bulleak.ru — VPS в Москве: Ubuntu 22.04, 1 vCPU, 1 ГБ RAM, 15 ГБ NVMe, nginx, сертификат Let's Encrypt (продлевается сам) |
| API | Там же, `https://bulleak.ru/api/v1`: Node 24 + tsx, PostgreSQL 14, служба systemd `bulleak-api`, слушает только `127.0.0.1:8787`, снаружи — через nginx |
| Почта | Resend, отправитель на домене bulleak.ru |
| Старый адрес | GitHub Pages, `akimov1712.github.io/Bulleak`, гостевой режим, обновляется после зелёного CI |
| DNS | Редактор DNS у регистратора: `A` и `AAAA` для `@` и `www` указывают на сервер |

IP сервера и доступы в репозиторий не записываются. Вход на сервер — только по SSH-ключу `~/.ssh/bulleak_deploy`, пароль отключён.

## Секреты
Файл `/etc/bulleak/api.env` (права `640 root:bulleak`) создаёт `api.sh` на самом сервере: пароль базы и `JWT_SECRET` генерируются там и никуда не копируются. Ключ Resend (`RESEND_API_KEY`) владелец вписывает в этот файл сам, затем `systemctl restart bulleak-api`.

## Скрипты (`deploy/server`)
| Скрипт | Что делает |
|---|---|
| `harden.sh` | Обновления и автоматические обновления безопасности, вход только по ключу, файрвол (22, 80, 443) |
| `nginx.sh` | nginx: сайт из `/var/www/bulleak/current`, `/api/` на API, gzip, кэш для `/assets/`, без кэша для `index.html` и `sw.js`, заголовки безопасности. С `ISSUE_CERT=1` получает сертификат и включает HTTPS, переадресацию с HTTP и с `www` |
| `api.sh` | Node 24, tsx, PostgreSQL, пользователь `bulleak`, база и секреты, служба `bulleak-api` |
| `release.sh` | Распаковывает новую версию сайта в `releases/<время>`, переключает `current`, хранит три последние |
| `release-api.sh` | То же для API в `/opt/bulleak/api`: `npm ci --omit=dev`, перезапуск, проверка `/health`, откат при ошибке. Миграции применяются при старте |

Новый сервер: скопировать скрипты в `/root`, выполнить `harden.sh`, `api.sh`, `ISSUE_CERT=1 nginx.sh` (после того как DNS указывает на сервер), затем выкладку.

Выложить сайт и API с компьютера (PowerShell; API берётся из последнего коммита):
```
$env:BULLEAK_HOST = 'root@<ip>'
./scripts/deploy-vps.ps1
```
`$env:BULLEAK_ONLY = 'site'` или `'api'` — выложить что-то одно.
Откатить версию: на сервере переключить ссылку `current` на предыдущую папку в `releases` (для API — затем `systemctl restart bulleak-api`).

## Резервные копии
- Каждую ночь (01:30 UTC) таймер `bulleak-backup` делает `pg_dump -Fc` в `/var/backups/bulleak`, хранятся 14 последних (скрипт `deploy/server/backup.sh`).
- Копия вне сервера: `./scripts/pull-backup.ps1` скачивает свежий дамп в `Документы\bulleak-backups` (нужен `$env:BULLEAK_HOST`). Запускать хотя бы раз в неделю или повесить на планировщик Windows.
- Восстановление на сервере: `systemctl stop bulleak-api`, затем `sudo -u postgres pg_restore --clean --if-exists -d bulleak <файл>.dump`, затем `systemctl start bulleak-api`.

## Сертификаты
- `www.bulleak.ru` — свой сертификат, проверка через сайт (webroot), продлевается сам.
- `bulleak.ru` — первый раз выпущен через TXT-запись `_acme-challenge` (2026-11-12): Timeweb отдаёт для домена скрытую AAAA-запись своей заглушки `2a03:6f00:1::5c35:60df`, которой нет в редакторе DNS, и Let's Encrypt по IPv6 попадал на неё. Продление настроено на webroot и заработает, когда поддержка Timeweb уберёт эту запись (до 2027-02-10, иначе выпустить снова через TXT). Пока она есть, посетители с IPv6 тоже попадают на заглушку.
- IPv6 на сервере не работает (исходящие соединения не проходят), поэтому своей AAAA-записи у домена нет.

## Дальше
1. Автоматическая выкладка из GitHub Actions.
2. Автоматическая копия дампов вне сервера (сейчас — вручную скриптом).
