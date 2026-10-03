import { BybitShot, type ShotHotspot } from './Shot';

const CONTRACT_HOTSPOTS: ShotHotspot[] = [
  {
    n: 1,
    x: 55,
    y: 24,
    title: 'Индексная цена (Index)',
    text: 'Средняя цена BTC на крупных спотовых биржах. От неё считается справедливая цена контракта.',
  },
  {
    n: 2,
    x: 55,
    y: 30.5,
    title: 'Цена маркировки (Mark)',
    text: 'Справедливая цена контракта по индексу. По ней Bybit считает нереализованный P&L и ликвидацию; к ней можно привязать триггер стопа.',
  },
  {
    n: 3,
    x: 55,
    y: 43.3,
    title: 'Открытый интерес (OI)',
    text: '«Сумма открытых позиций» — сколько контрактов сейчас открыто. Растёт, когда открываются новые позиции, падает при закрытии и ликвидациях.',
  },
];

/** «Данные контракта» panel of the perpetual terminal: index, mark price, open interest. */
export function BybitContractData() {
  return (
    <BybitShot
      src="img/bybit/contract-data.webp"
      width={640}
      height={832}
      maxWidth={360}
      screen="Данные контракта"
      alt="Панель «Данные контракта BTCUSDT» на Bybit: срок действия — бессрочный, индексная цена, цена маркировки, сумма открытых позиций, оборот и объём за 24 часа, стоимость контракта 1 BTC."
      hotspots={CONTRACT_HOTSPOTS}
      taken="октябрь 2026"
    />
  );
}

/** Ticker bar of a perpetual: last and mark price, 24 h stats, funding rate and countdown. */
export function BybitFundingBar() {
  return (
    <BybitShot
      src="img/bybit/funding-bar.webp"
      width={1400}
      height={90}
      screen="Строка контракта"
      alt="Строка над графиком бессрочного контракта BTCUSDT: последняя цена и под ней цена маркировки, изменение, максимум и минимум за 24 часа, оборот, справа «Ставка / Отсчет до»: 0,0100 % и время до следующего финансирования, интервал 8 часов."
      hotspots={[]}
      taken="октябрь 2026"
    />
  );
}

/** Contract rules page: funding every 8 h, premium index. */
export function BybitContractDetail() {
  return (
    <BybitShot
      src="img/bybit/contract-detail.webp"
      width={1400}
      height={384}
      screen="Данные контракта: правила"
      alt="Страница правил контракта BTCUSDT на Bybit: бессрочный контракт без даты окончания, финансирование раз в 8 часов, время следующего финансирования, ставки кредитования и индекс премиума .BTCUSDTPI для расчёта ставки."
      hotspots={[]}
      taken="октябрь 2026"
    />
  );
}
