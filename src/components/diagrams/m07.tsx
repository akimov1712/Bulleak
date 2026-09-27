import { Box, DiagramSvg, Txt } from './kit';
import type { DiagramTone } from './tones';

/** BTC dominance: share of BTC in the total crypto market cap, two illustrative states. */
export function BtcDominance() {
  const bar = (y: number, btc: number, title: string, note: string, tone: DiagramTone) => {
    const w = 300;
    const bw = (w * btc) / 100;
    return (
      <g>
        <Txt x={30} y={y - 10} size={14} bold tone={tone}>
          {title}
        </Txt>
        <rect x={30} y={y} width={bw} height={34} rx={6} className="fill-warn" />
        <rect
          x={30 + bw}
          y={y}
          width={w - bw}
          height={34}
          rx={6}
          className="fill-epic"
          opacity={0.75}
        />
        <Txt x={30 + bw / 2} y={y + 22} size={13} bold textAnchor="middle" className="fill-white">
          {`BTC ${btc} %`}
        </Txt>
        <Txt
          x={30 + bw + (w - bw) / 2}
          y={y + 22}
          size={13}
          bold
          textAnchor="middle"
          className="fill-white"
        >
          {`альты ${100 - btc} %`}
        </Txt>
        <Txt x={30} y={y + 54} size={13} tone="muted">
          {note}
        </Txt>
      </g>
    );
  };
  return (
    <DiagramSvg
      width={360}
      height={250}
      title="Доминация BTC — доля биткоина в общей капитализации криптовалют. Рост доминации означает, что деньги идут в BTC и альткоины слабее; падение доминации на растущем рынке — признак альтсезона. Цифры условные"
    >
      {bar(40, 62, 'Доминация растёт', 'деньги уходят в BTC, альты отстают', 'warn')}
      {bar(
        140,
        45,
        'Доминация падает на росте рынка',
        'альты растут быстрее — «альтсезон»',
        'epic',
      )}
      <Txt x={180} y={236} size={12} tone="muted" textAnchor="middle">
        доля BTC во всей капитализации; цифры условные
      </Txt>
    </DiagramSvg>
  );
}

const MATRIX = [
  {
    price: 'Цена ↑',
    oi: 'OI ↑',
    title: 'Новые лонги',
    note: 'в рынок заходят деньги — тренд с топливом',
    tone: 'bull' as const,
  },
  {
    price: 'Цена ↑',
    oi: 'OI ↓',
    title: 'Закрытие шортов',
    note: 'рост на выкупе шортов — топливо кончается',
    tone: 'warn' as const,
  },
  {
    price: 'Цена ↓',
    oi: 'OI ↑',
    title: 'Новые шорты',
    note: 'продавцы открывают позиции — давление вниз',
    tone: 'bear' as const,
  },
  {
    price: 'Цена ↓',
    oi: 'OI ↓',
    title: 'Выход лонгов',
    note: 'закрытие и ликвидации лонгов — часто близко к очистке',
    tone: 'info' as const,
  },
];

/** Price × open interest: four combinations and how they are usually read. */
export function OiPriceMatrix() {
  const cw = 174;
  const ch = 132;
  return (
    <DiagramSvg
      width={360}
      height={ch * 2 + 34}
      title="Матрица цены и открытого интереса: цена растёт и OI растёт — новые лонги; цена растёт, OI падает — закрытие шортов; цена падает, OI растёт — новые шорты; цена падает и OI падает — выход и ликвидации лонгов. Это вероятностная интерпретация, а не правило"
    >
      {MATRIX.map((m, i) => {
        const x = 4 + (i % 2) * (cw + 4);
        const y = Math.floor(i / 2) * ch;
        return (
          <g key={m.title}>
            <Box x={x} y={y + 2} w={cw} h={ch - 6} tone={m.tone} soft />
            <Txt x={x + 12} y={y + 26} size={14} bold>
              {`${m.price}  ${m.oi}`}
            </Txt>
            <Txt x={x + 12} y={y + 50} size={14} bold tone={m.tone}>
              {m.title}
            </Txt>
            <foreignObject x={x + 8} y={y + 60} width={cw - 16} height={ch - 70}>
              <div className="text-[13px] leading-tight font-semibold text-text-muted">
                {m.note}
              </div>
            </foreignObject>
          </g>
        );
      })}
      <Txt x={180} y={ch * 2 + 24} size={12} tone="muted" textAnchor="middle">
        OI — открытый интерес, число открытых фьючерсных контрактов
      </Txt>
    </DiagramSvg>
  );
}

const ZONES = [
  { from: 0, to: 24, label: 'крайний страх', tone: 'bear' as const },
  { from: 25, to: 44, label: 'страх', tone: 'warn' as const },
  { from: 45, to: 55, label: 'нейтр.', tone: 'muted' as const },
  { from: 56, to: 75, label: 'жадность', tone: 'info' as const },
  { from: 76, to: 100, label: 'крайняя жадность', tone: 'bull' as const },
];

const FILL: Record<string, string> = {
  bear: 'fill-bear',
  warn: 'fill-warn',
  muted: 'fill-text-muted',
  info: 'fill-info',
  bull: 'fill-bull',
};

/** Fear & Greed scale 0–100 with zones and how the course uses the extremes. */
export function FearGreedScale() {
  const x0 = 20;
  const w = 320;
  const px = (v: number) => x0 + (v / 100) * w;
  return (
    <DiagramSvg
      width={360}
      height={250}
      title="Шкала индекса страха и жадности от 0 до 100: крайний страх, страх, нейтрально, жадность, крайняя жадность. Крайние значения — повод пересмотреть риск: при крайней жадности не наращивать лонги с плечом, при крайнем страхе не продавать в панике. Это не сигнал входа"
    >
      <Txt x={20} y={24} size={14} bold>
        Индекс страха и жадности
      </Txt>
      {ZONES.map((z) => (
        <g key={z.label}>
          <rect
            x={px(z.from)}
            y={50}
            width={px(z.to + 1) - px(z.from) - 2}
            height={30}
            rx={4}
            className={FILL[z.tone]}
            opacity={0.85}
          />
          <Txt
            x={px(z.from)}
            y={98}
            size={12}
            bold
            textAnchor={z.from === 0 ? 'start' : 'middle'}
            tone={z.tone}
          >
            {String(z.from)}
          </Txt>
        </g>
      ))}
      <Txt x={px(100)} y={98} size={12} bold textAnchor="end" tone="bull">
        100
      </Txt>
      <Txt x={px(0)} y={120} size={13} bold tone="bear">
        крайний страх
      </Txt>
      <Txt x={px(100)} y={120} size={13} bold tone="bull" textAnchor="end">
        крайняя жадность
      </Txt>
      <Box x={10} y={134} w={165} h={96} tone="bear" soft />
      <Box x={185} y={134} w={165} h={96} tone="bull" soft />
      <foreignObject x={16} y={140} width={153} height={86}>
        <div className="text-[12px] leading-tight font-semibold text-text">
          Толпа в панике. Не продавать на эмоциях; дно не гарантировано — ждать структуру.
        </div>
      </foreignObject>
      <foreignObject x={191} y={140} width={153} height={86}>
        <div className="text-[12px] leading-tight font-semibold text-text">
          Толпа в эйфории. Не наращивать лонги с плечом, уменьшить риск на сделку.
        </div>
      </foreignObject>
      <Txt x={180} y={246} size={11} tone="muted" textAnchor="middle">
        границы зон у разных сервисов немного отличаются
      </Txt>
    </DiagramSvg>
  );
}

const EVENTS = [
  {
    name: 'FOMC',
    what: 'решение ФРС по ставке',
    when: '8 раз в год',
    risk: 'резкие движения на решении и пресс-конференции',
  },
  {
    name: 'CPI',
    what: 'инфляция в США',
    when: 'раз в месяц',
    risk: 'всплеск волатильности в момент публикации',
  },
  {
    name: 'NFP',
    what: 'занятость в США',
    when: 'раз в месяц, в пятницу',
    risk: 'резкая свеча, проскальзывание стопов',
  },
  {
    name: 'Крипто-новости',
    what: 'ETF, регуляторы, взломы, листинги',
    when: 'непредсказуемо',
    risk: 'гэпы и каскады ликвидаций',
  },
];

/** Macro events calendar cheat sheet: what, how often, why dangerous. */
export function MacroEvents() {
  const rowH = 82;
  return (
    <DiagramSvg
      width={360}
      height={EVENTS.length * rowH + 30}
      title="Главные события для крипторынка: FOMC — решение ФРС по ставке, 8 раз в год; CPI — инфляция в США, раз в месяц; NFP — данные по занятости, раз в месяц; крипто-новости — ETF, регуляторы, взломы, листинги, непредсказуемо. Перед ними растёт волатильность и проскальзывание"
    >
      {EVENTS.map((e, i) => {
        const y = 4 + i * rowH;
        const tone = i === 3 ? 'epic' : 'info';
        return (
          <g key={e.name}>
            <Box x={4} y={y} w={352} h={rowH - 8} tone={tone} soft r={10} />
            <Txt x={14} y={y + 22} size={15} bold tone={tone}>
              {e.name}
            </Txt>
            <Txt x={346} y={y + 21} size={12} tone="muted" textAnchor="end">
              {e.when}
            </Txt>
            <Txt x={14} y={y + 42} size={13} bold>
              {e.what}
            </Txt>
            <Txt x={14} y={y + 62} size={12} tone="muted">
              {e.risk}
            </Txt>
          </g>
        );
      })}
    </DiagramSvg>
  );
}
