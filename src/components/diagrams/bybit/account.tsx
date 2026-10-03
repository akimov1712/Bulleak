import { Mockup, type Hotspot } from './Mockup';

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
                      ? "relative before:absolute before:-inset-2.5 before:content-[''] inline-flex size-6 items-center justify-center rounded-full bg-xp text-xs font-extrabold text-on-xp"
                      : "relative before:absolute before:-inset-2.5 before:content-[''] inline-flex size-6 items-center justify-center rounded-full bg-info text-xs font-extrabold text-surface"
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
