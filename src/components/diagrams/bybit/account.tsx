import { Mockup, MockRow, type Hotspot } from './Mockup';

const SECURITY_HOTSPOTS: Hotspot[] = [
  {
    n: 1,
    title: 'Пароль входа',
    text: 'Уникальный, длинный, только для Bybit. Меняй сразу, если есть подозрение на утечку.',
  },
  {
    n: 2,
    title: 'Google Authenticator (2FA)',
    text: 'Главная защита: без кода из приложения не войти и не вывести средства. Настраивай первым делом, SMS — хуже.',
  },
  {
    n: 3,
    title: 'Антифишинговый код',
    text: 'Твоё слово появится во всех настоящих письмах Bybit. Нет кода — письмо поддельное.',
  },
  {
    n: 4,
    title: 'Настройки вывода',
    text: 'Адресная книга, режим «вывод только по адресной книге» и блокировка новых адресов на 24 часа.',
  },
  {
    n: 5,
    title: 'Устройства и вход',
    text: 'Список устройств, с которых входили в аккаунт. Незнакомое устройство — сразу удали его и смени пароль.',
  },
];

/** Account security settings (m02-l01). */
export function BybitSecurity() {
  return (
    <Mockup screen="Безопасность аккаунта" hotspots={SECURITY_HOTSPOTS} checked="сентябрь 2026">
      {(active, toggle) => (
        <div className="flex flex-col gap-1">
          <p className="mb-1 px-3 text-xs font-extrabold tracking-wide text-text-muted uppercase">
            Вход и подтверждение
          </p>
          <MockRow
            label="Пароль входа"
            status="Изменить"
            hotspot={1}
            active={active === 1}
            onHotspot={toggle}
          />
          <MockRow
            label="Google Authenticator"
            hint="Код для входа и вывода"
            status="Настроить"
            tone="warn"
            hotspot={2}
            active={active === 2}
            onHotspot={toggle}
          />
          <MockRow label="Электронная почта" hint="t***@mail.com" status="Привязана" tone="bull" />
          <p className="mt-2 mb-1 px-3 text-xs font-extrabold tracking-wide text-text-muted uppercase">
            Защита от мошенников
          </p>
          <MockRow
            label="Антифишинговый код"
            status="Не задан"
            tone="warn"
            hotspot={3}
            active={active === 3}
            onHotspot={toggle}
          />
          <MockRow
            label="Безопасность вывода"
            hint="Адресная книга, блокировка новых адресов"
            status="Настроить"
            tone="warn"
            hotspot={4}
            active={active === 4}
            onHotspot={toggle}
          />
          <MockRow
            label="Управление устройствами"
            hint="Где выполнен вход"
            status="2 устройства"
            hotspot={5}
            active={active === 5}
            onHotspot={toggle}
          />
        </div>
      )}
    </Mockup>
  );
}

const KYC_LEVELS = [
  {
    n: 1,
    name: 'Standard',
    needs: ['Документ, удостоверяющий личность', 'Проверка лица (селфи)'],
    gives: 'Депозиты, торговля, вывод до 1 млн USDT в день',
  },
  {
    n: 2,
    name: 'Advanced',
    needs: ['Всё из Standard', 'Подтверждение адреса (документ не старше 3 месяцев)'],
    gives: 'Вывод до 2 млн USDT в день и больше возможностей',
  },
  {
    n: 3,
    name: 'Pro',
    needs: ['Всё из Advanced', 'Подтверждение источника дохода'],
    gives: 'Для очень крупных оборотов',
  },
];

const KYC_HOTSPOTS: Hotspot[] = KYC_LEVELS.map((l) => ({
  n: l.n,
  title: `Уровень ${l.name}`,
  text:
    l.n === 1
      ? 'Для обучения и небольших сумм достаточно этого уровня. Проверка обычно занимает около 15 минут, иногда до 48 часов.'
      : l.n === 2
        ? 'Нужен, если лимитов Standard не хватает. Подходят выписка из банка, счёт за коммунальные услуги или документ о регистрации.'
        : 'Расширенная проверка для крупных клиентов. Новичку не нужна.',
}));

/** Individual KYC levels (m02-l01). Limits from Bybit Help Center, September 2026. */
export function BybitKycLevels() {
  return (
    <Mockup screen="Верификация личности" hotspots={KYC_HOTSPOTS} checked="сентябрь 2026">
      {(active, toggle) => (
        <ol className="grid gap-2 sm:grid-cols-3">
          {KYC_LEVELS.map((l) => (
            <li
              key={l.n}
              className={
                active === l.n
                  ? 'rounded-xl border-2 border-xp-shade bg-xp/10 p-3'
                  : 'rounded-xl border-2 border-border p-3'
              }
            >
              <div className="mb-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggle(l.n)}
                  aria-pressed={active === l.n}
                  aria-label={`Пояснение ${l.n}: уровень ${l.name}`}
                  className={
                    active === l.n
                      ? 'inline-flex size-6 items-center justify-center rounded-full bg-xp text-xs font-extrabold text-on-xp'
                      : 'inline-flex size-6 items-center justify-center rounded-full bg-info text-xs font-extrabold text-surface'
                  }
                >
                  {l.n}
                </button>
                <span className="font-extrabold">{l.name}</span>
              </div>
              <ul className="mb-2 flex list-disc flex-col gap-0.5 pl-4 text-xs text-text-muted">
                {l.needs.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <p className="text-xs font-bold">{l.gives}</p>
            </li>
          ))}
        </ol>
      )}
    </Mockup>
  );
}
