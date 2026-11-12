import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { PageHeader } from '@/app/layout/PageHeader';
import { paths } from '@/app/paths';
import { Card } from '@/components/ui/Card';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PRIVACY_CONTACT_URL, PRIVACY_UPDATED } from '@/content/legal';

const linkClass = 'font-bold text-info underline-offset-2 hover:underline';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="flex flex-col gap-2 text-text-muted">{children}</div>
    </Card>
  );
}

/** Privacy policy (T-1604): what the site stores, where, for how long, and how to remove it. */
export function PrivacyPage() {
  usePageTitle('Конфиденциальность');
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Политика конфиденциальности" subtitle={`Обновлено ${PRIVACY_UPDATED}`} />

      <Section title="Коротко">
        <ul className="list-disc space-y-1 pl-5">
          <li>Без аккаунта сайт ничего о тебе не отправляет: всё хранится в этом браузере.</li>
          <li>
            С аккаунтом на сервере хранятся имя, e-mail, прогресс, настройки, сделки тренажёра и
            журнал — чтобы они были на всех твоих устройствах.
          </li>
          <li>Нет рекламы, счётчиков посещений и продажи данных.</li>
          <li>Скачать или удалить свои данные можно в любой момент в настройках.</li>
        </ul>
      </Section>

      <Section title="Без аккаунта">
        <p>
          Прогресс, настройки, сделки тренажёра и журнал хранятся в памяти браузера (localStorage и
          IndexedDB) на этом устройстве. Они не уходят на сервер. Если очистить данные сайта в
          браузере, они пропадут — поэтому в настройках есть экспорт в файл.
        </p>
      </Section>

      <Section title="Что хранится с аккаунтом">
        <ul className="list-disc space-y-1 pl-5">
          <li>Имя и e-mail, которые ты указал при регистрации.</li>
          <li>Пароль — только в виде хэша (argon2): сам пароль не знает никто, включая нас.</li>
          <li>Прогресс курса, настройки, сделки тренажёра и записи журнала.</li>
          <li>
            Сессии входа: когда начата и какой браузер (строка User-Agent) — чтобы можно было выйти
            на всех устройствах.
          </li>
        </ul>
        <p>
          Для защиты от подбора пароля сервер на время считает попытки входа с одного IP-адреса —
          только в памяти, без записи в базу. Веб-сервер ведёт технические журналы запросов (IP,
          адрес страницы, время), они удаляются автоматически через 14 дней.
        </p>
      </Section>

      <Section title="Где и сколько">
        <p>
          Сервер и база данных находятся в России (Москва). Данные хранятся, пока существует
          аккаунт. Ночные резервные копии базы (на сервере и одна копия вне его, у владельца сайта)
          хранятся 14 дней, после удаления аккаунта его данные исчезают из них в течение этого
          срока.
        </p>
        <p>
          Письма (подтверждение e-mail и сброс пароля) отправляет сервис Resend. Для отправки ему
          передаются твой e-mail и текст письма; серверы Resend находятся в США.
        </p>
      </Section>

      <Section title="Cookie">
        <p>
          Сайт использует одну служебную cookie — для продления входа в аккаунт. Она недоступна
          скриптам и действует только для адресов API. Рекламных и аналитических cookie нет.
        </p>
      </Section>

      <Section title="Твои права">
        <p>
          В{' '}
          <Link to={paths.settings()} className={linkClass}>
            настройках
          </Link>{' '}
          → «Аккаунт» можно скачать все свои данные одним файлом и удалить аккаунт: данные на
          сервере удаляются сразу. Чтобы исправить имя или e-mail, напиши по контакту ниже.
        </p>
        <p>
          Вопросы об обработке данных —{' '}
          <a href={PRIVACY_CONTACT_URL} className={linkClass} target="_blank" rel="noreferrer">
            в обсуждениях проекта на GitHub
          </a>{' '}
          (не публикуй там свой e-mail и другие личные данные — достаточно описать вопрос).
        </p>
      </Section>
    </div>
  );
}
