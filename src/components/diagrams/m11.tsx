import { Arrow, Box, DiagramSvg, Note, Polyline, Txt, type Pt } from './kit';
import type { DiagramTone } from './tones';

const PARTS: readonly { title: string; example: string; tone: DiagramTone; dashed?: boolean }[] = [
  { title: 'Рынок и ТФ', example: 'BTC, ETH · 1D / 4H / 1H', tone: 'muted' },
  { title: 'Контекст', example: '1D: выше EMA 200, HH/HL', tone: 'info' },
  { title: 'Зона', example: '4H: откат в конфлюенс', tone: 'info' },
  { title: 'Триггер', example: '1H: поглощение, пин-бар', tone: 'warn' },
  { title: 'Стоп', example: 'за свингом + 0,5 ATR', tone: 'bear' },
  { title: 'Выход', example: 'цель ≥ 2R, BE, трейлинг', tone: 'bull' },
  { title: 'Риск', example: '1 % на сделку, плечо ≤ 3x', tone: 'epic' },
  { title: 'Отмена', example: 'новости, закрытие под зоной', tone: 'bear', dashed: true },
];

/** A strategy is a chain of yes/no rules: market, context, zone, trigger, stop, exit, risk, cancel. */
export function StrategyAnatomy() {
  const step = 48;
  return (
    <DiagramSvg
      width={360}
      height={34 + PARTS.length * step + 30}
      title="Из чего состоит стратегия: рынок и таймфреймы; контекст — например, цена на дневном графике выше EMA 200 и структура HH/HL; зона — откат на 4H в конфлюенс; триггер на 1H — поглощение или пин-бар; стоп за свингом плюс половина ATR; выход — цель не меньше 2R, безубыток, трейлинг; риск 1 процент и плечо не больше 3x; условия отмены. Каждое правило проверяется ответом да или нет"
    >
      <Txt x={10} y={20} size={14} bold>
        Анатомия стратегии
      </Txt>
      <line
        x1={40}
        x2={40}
        y1={40}
        y2={32 + (PARTS.length - 2) * step + 10}
        strokeWidth={3}
        className="stroke-text-muted"
      />
      {PARTS.map((p, i) => {
        const y = 32 + i * step;
        return (
          <g key={p.title}>
            <Box x={10} y={y} w={340} h={38} tone={p.tone} soft dashed={p.dashed} r={10} />
            <Txt x={22} y={y + 24} size={14} bold tone={p.tone === 'muted' ? 'text' : p.tone}>
              {p.title}
            </Txt>
            <Txt x={340} y={y + 24} size={12} tone="muted" textAnchor="end">
              {p.example}
            </Txt>
          </g>
        );
      })}
      <Txt x={180} y={34 + PARTS.length * step + 16} size={12} tone="muted" textAnchor="middle">
        Каждое правило — вопрос с ответом «да» или «нет»
      </Txt>
    </DiagramSvg>
  );
}

const TPS_STEPS = [
  { q: '1D: цена выше EMA 200, структура HH/HL?', no: 'Лонг не ищем' },
  { q: '4H: откат в зону, 2 из 3: флип-уровень, EMA 50, Фибо 0,5–0,618?', no: 'Ждём' },
  { q: '1H: поглощение, пин-бар или слом LH?', no: 'Ждём. Закрытие под зоной — отмена' },
  { q: 'Стоп за свингом + 0,5 ATR. До сопротивления ≥ 2R?', no: 'Пропуск' },
  { q: 'Нет важных новостей 12 ч, открытый риск ≤ 3 %?', no: 'Пропуск' },
] as const;

/** Trend Pullback Swing as a decision flow: every “no” ends in waiting or a skip. */
export function TpsFlow() {
  const step = 84;
  const h = 66;
  const last = 32 + TPS_STEPS.length * step;
  return (
    <DiagramSvg
      width={360}
      height={last + 58}
      title="Блок-схема стратегии Trend Pullback Swing для лонга, шорт — зеркально. Первое: на дневном графике цена выше EMA 200 и структура HH/HL, иначе лонг не ищем. Второе: на 4H цена откатилась в зону, где совпадают два из трёх — флип-уровень, EMA 50 и Фибоначчи 0,5–0,618, иначе ждём. Третье: на 1H есть триггер — поглощение, пин-бар или слом нисходящей структуры, иначе ждём, а закрытие 4H под зоной отменяет сетап. Четвёртое: стоп за свингом плюс половина ATR, до сопротивления не меньше 2R, иначе пропуск. Пятое: нет важных новостей в ближайшие 12 часов и открытый риск не больше 3 процентов, иначе пропуск. Тогда вход с риском 1 процент, плечом не больше 3x и изолированной маржой"
    >
      {({ arrow }) => (
        <>
          <Txt x={10} y={20} size={14} bold>
            TPS: лонг (шорт — зеркально)
          </Txt>
          {TPS_STEPS.map((s, i) => {
            const y = 32 + i * step;
            return (
              <g key={s.q}>
                <Box x={10} y={y} w={206} h={h} tone="info" soft r={10} />
                <Note x={18} y={y + 6} w={192} h={h - 8} className="text-[12px]">
                  {`${i + 1}. ${s.q}`}
                </Note>
                <Box x={244} y={y} w={106} h={h} tone="muted" dashed r={10} />
                <Note x={250} y={y + 4} w={96} h={h - 6} className="text-[12px] text-text-muted">
                  {s.no}
                </Note>
                <Arrow x1={217} y1={y + h / 2} x2={242} y2={y + h / 2} arrow={arrow} tone="bear" />
                <Txt x={230} y={y + h / 2 - 6} size={11} bold tone="bear" textAnchor="middle">
                  нет
                </Txt>
                <Arrow
                  x1={112}
                  y1={y + h + 1}
                  x2={112}
                  y2={y + step - 1}
                  arrow={arrow}
                  tone="bull"
                />
                <Txt x={120} y={y + h + 14} size={11} bold tone="bull">
                  да
                </Txt>
              </g>
            );
          })}
          <Box x={10} y={last} w={340} h={48} tone="bull" soft r={10} />
          <Note x={18} y={last + 6} w={324} h={40} className="text-center">
            Вход: риск 1 %, плечо ≤ 3x, изолированная маржа
          </Note>
        </>
      )}
    </DiagramSvg>
  );
}

/** Price path of one trade in R (x in SVG units). */
const TRADE: readonly (readonly [number, number])[] = [
  [40, 0],
  [85, 1.3],
  [125, -0.1],
  [185, 3],
  [215, 2.6],
  [260, 3.9],
  [340, 1.8],
];
const TRAIL_R = 2.5;

const crossing = (r: number, from: number): Pt => {
  for (let i = from; i < TRADE.length - 1; i++) {
    const [x1, r1] = TRADE[i] ?? [0, 0];
    const [x2, r2] = TRADE[i + 1] ?? [0, 0];
    if ((r1 - r) * (r2 - r) <= 0 && r1 !== r2) return [x1 + ((r - r1) / (r2 - r1)) * (x2 - x1), r];
  }
  return [0, r];
};

const MANAGEMENT = [
  { key: 'A', title: 'Тейк 2R', result: '+2R', tone: 'bull' },
  { key: 'B', title: '50 % на 2R + трейлинг под HL', result: '+2,25R', tone: 'bull' },
  { key: 'C', title: 'Безубыток сразу после +1R', result: '0R', tone: 'muted' },
] as const;

/** One trade, three ways to manage it: fixed take, partial + trailing, early breakeven. */
export function TradeManagement() {
  const y = (r: number) => 172 - ((r + 1.2) / 5.4) * 140;
  const path: Pt[] = TRADE.map(([x, r]) => [x, y(r)]);
  const exits: { key: string; at: Pt }[] = [
    { key: 'A', at: crossing(2, 2) },
    { key: 'B', at: crossing(TRAIL_R, 5) },
    { key: 'C', at: crossing(0, 1) },
  ];
  const levels = [
    { r: -1, label: 'стоп −1R', cls: 'stroke-bear', tone: 'bear' },
    { r: 0, label: 'вход', cls: 'stroke-text-muted', tone: 'muted' },
    { r: 2, label: '2R', cls: 'stroke-bull', tone: 'bull' },
  ] as const;
  return (
    <DiagramSvg
      width={360}
      height={330}
      title="Одна сделка, три способа сопровождения. Цена поднялась до плюс 1,3R, откатила чуть ниже входа, затем выросла до 3,9R и упала. Вариант A — фиксированный тейк 2R — итог плюс 2R. Вариант B — половина позиции на 2R, остаток трейлингом под последний HL — итог плюс 2,25R. Вариант C — безубыток сразу после плюс 1R — откат выбил позицию в ноль. На другой сделке порядок может поменяться, способ выбирают бэктестом"
    >
      <Txt x={10} y={20} size={14} bold>
        Одна сделка — три сопровождения
      </Txt>
      {levels.map((l) => (
        <g key={l.r}>
          <line
            x1={36}
            x2={350}
            y1={y(l.r)}
            y2={y(l.r)}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            className={l.cls}
          />
          <Txt x={32} y={y(l.r) + 4} size={11} bold tone={l.tone} textAnchor="end">
            {l.r === 0 ? '0' : `${l.r > 0 ? '+' : '−'}${Math.abs(l.r)}R`}
          </Txt>
        </g>
      ))}
      <line
        x1={215}
        x2={350}
        y1={y(TRAIL_R)}
        y2={y(TRAIL_R)}
        strokeWidth={2}
        strokeDasharray="3 3"
        className="stroke-info"
      />
      <Txt x={222} y={y(TRAIL_R) + 12} size={11} bold tone="info">
        трейлинг
      </Txt>
      <Polyline pts={path} width={2.5} />
      {exits.map((e) => (
        <g key={e.key}>
          <circle
            cx={e.at[0]}
            cy={y(e.at[1])}
            r={9}
            className="fill-surface stroke-text"
            strokeWidth={2}
          />
          <Txt x={e.at[0]} y={y(e.at[1]) + 4} size={11} bold textAnchor="middle">
            {e.key}
          </Txt>
        </g>
      ))}
      {MANAGEMENT.map((m, i) => {
        const ry = 190 + i * 34;
        return (
          <g key={m.key}>
            <rect
              x={10}
              y={ry}
              width={340}
              height={28}
              rx={8}
              strokeWidth={1.5}
              className="fill-surface-2 stroke-border"
            />
            <Txt x={20} y={ry + 19} size={13} bold>
              {`${m.key} · ${m.title}`}
            </Txt>
            <Txt x={340} y={ry + 19} size={14} bold tone={m.tone} textAnchor="end">
              {m.result}
            </Txt>
          </g>
        );
      })}
      <Note x={10} y={292} w={340} h={38} className="text-[12px] text-text-muted">
        На другой сделке порядок поменяется. Лучший способ — тот, что проверен бэктестом и
        соблюдается.
      </Note>
    </DiagramSvg>
  );
}

const TODAY = 210;
const fitted: Pt[] = [
  ...Array.from({ length: 20 }, (_, i): Pt => [20 + i * 10, 196 - 126 * (i / 19) ** 1.1]),
  ...Array.from({ length: 14 }, (_, i): Pt => [
    220 + i * 10,
    74 + (i + 1) * 5.5 + Math.sin(i * 1.9) * 10,
  ]),
];
const simple: Pt[] = [
  ...Array.from({ length: 20 }, (_, i): Pt => [
    20 + i * 10,
    196 - 76 * (i / 19) + Math.sin(i * 1.3) * 9 + Math.cos(i * 2.1) * 4,
  ]),
  ...Array.from({ length: 14 }, (_, i): Pt => [
    220 + i * 10,
    120 - 26 * ((i + 1) / 14) + Math.sin(i * 1.7) * 8,
  ]),
];

/** Overfitting: a curve tuned to history looks perfect until new data arrives. */
export function Overfitting() {
  return (
    <DiagramSvg
      width={360}
      height={292}
      title="Ловушка подгонки. На истории стратегия с 12 подобранными параметрами даёт идеально ровную растущую кривую капитала, а простая стратегия из 4 правил — неровную. На новых данных подогнанная кривая ломается и идёт вниз, хотя ожидался рост, а простая продолжает расти примерно как раньше. Стратегию проверяют на данных, которых не было при настройке"
    >
      <Txt x={10} y={20} size={14} bold>
        Подгонка под историю
      </Txt>
      <rect x={TODAY} y={32} width={140} height={178} className="fill-surface-2" />
      <line
        x1={TODAY}
        x2={TODAY}
        y1={32}
        y2={210}
        strokeWidth={1.5}
        strokeDasharray="4 3"
        className="stroke-text-muted"
      />
      <Txt x={TODAY - 6} y={48} size={12} bold tone="muted" textAnchor="end">
        история
      </Txt>
      <Txt x={TODAY + 6} y={48} size={12} bold tone="muted">
        новые данные
      </Txt>
      <Polyline
        pts={[
          [TODAY, fitted[19]?.[1] ?? 70],
          [340, 40],
        ]}
        tone="bear"
        width={1.5}
        dashed
      />
      <Txt x={338} y={62} size={11} bold tone="bear" textAnchor="end">
        ожидание
      </Txt>
      <Polyline pts={simple} tone="info" width={2.5} />
      <Polyline pts={fitted} tone="bear" width={3} />
      <line x1={20} x2={350} y1={210} y2={210} strokeWidth={1.5} className="stroke-border" />
      <line x1={14} x2={34} y1={230} y2={230} strokeWidth={3} className="stroke-bear" />
      <Txt x={40} y={234} size={12} bold>
        подогнанная: 12 параметров
      </Txt>
      <line x1={14} x2={34} y1={250} y2={250} strokeWidth={3} className="stroke-info" />
      <Txt x={40} y={254} size={12} bold>
        простая: 4 правила
      </Txt>
      <Note x={10} y={262} w={340} h={30} className="text-[12px] text-text-muted">
        Проверяй на данных, которых не было при настройке.
      </Note>
    </DiagramSvg>
  );
}
