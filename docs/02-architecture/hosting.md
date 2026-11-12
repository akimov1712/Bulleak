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

## Дальше
1. Автоматическая выкладка из GitHub Actions.
2. Резервные копии базы — вне этого сервера.
