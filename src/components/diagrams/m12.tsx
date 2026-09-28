import { Arrow, Box, DiagramSvg, Note, Txt } from './kit';
import type { DiagramTone } from './tones';

const STAIRS: readonly { value: string; sub: string; tone: DiagramTone }[] = [
  { value: 'Демо', sub: '30+ сделок', tone: 'info' },
  { value: '0,5 %', sub: '30 сделок', tone: 'warn' },
  { value: '0,75 %', sub: '30 сделок', tone: 'warn' },
  { value: '1 %', sub: 'рабочий риск', tone: 'bull' },
];

/** Scaling ladder: demo → 0.5 % → 0.75 % → 1 % risk, one step per 30 disciplined trades. */
export function ScalingLadder() {
  const base = 236;
  const stepH = 40;
  const w = 82;
  return (
    <DiagramSvg
      width={360}
      height={304}
      title="Лестница масштабирования: сначала демо или форвард-тест от 30 сделок, затем реальный счёт с риском 0,5 процента, потом 0,75 процента и рабочий риск 1 процент. Шаг вверх — после 30 сделок с положительным матожиданием и без нарушений плана. Шаг вниз — при нарушении лимитов или просадке больше 10 процентов. Депозит пополняют по плану из сбережений, а не после убытка"
    >
      {({ arrow }) => (
        <>
          <Txt x={10} y={20} size={14} bold>
            Лестница масштабирования
          </Txt>
          <Txt x={10} y={42} size={12} bold tone="bull">
            ▲ 30 сделок, E &gt; 0, план соблюдён
          </Txt>
          <Txt x={10} y={60} size={12} bold tone="bear">
            ▼ нарушены лимиты или просадка &gt; 10 %
          </Txt>
          {STAIRS.map((s, i) => {
            const x = 10 + i * 86;
            const top = base - (i + 1) * stepH;
            const next = STAIRS[i + 1];
            return (
              <g key={s.value}>
                <Box x={x} y={top} w={w} h={base - top} tone={s.tone} soft r={8} />
                <Txt x={x + w / 2} y={top + 20} size={15} bold tone={s.tone} textAnchor="middle">
                  {s.value}
                </Txt>
                <Txt x={x + w / 2} y={top + 35} size={11} tone="muted" textAnchor="middle">
                  {s.sub}
                </Txt>
                {next && (
                  <Arrow
                    x1={x + w / 2 + 8}
                    y1={top - 10}
                    x2={x + 86 + 12}
                    y2={top - stepH - 12}
                    arrow={arrow}
                    tone="bull"
                  />
                )}
              </g>
            );
          })}
          <Note x={10} y={244} w={340} h={60} className="text-[12px] text-text-muted">
            Депозит пополняй по плану из сбережений — не «доливай» после убытка. Часть прибыли
            полезно выводить.
          </Note>
        </>
      )}
    </DiagramSvg>
  );
}

const CYCLE_STEPS = [
  { text: 'Разбор журнала', x: 125, y: 40, tone: 'info' },
  { text: 'Одно улучшение', x: 240, y: 118, tone: 'warn' },
  { text: 'Тест: бэктест или демо', x: 125, y: 196, tone: 'epic' },
  { text: 'Внедрение в план', x: 10, y: 118, tone: 'bull' },
] as const;

/** Monthly improvement loop: review the journal, change one thing, test it, adopt it. */
export function GrowthRoadmap() {
  const w = 110;
  const h = 48;
  return (
    <DiagramSvg
      width={360}
      height={332}
      title="Цикл развития трейдера, каждый месяц: разбор журнала, одно улучшение, проверка улучшения бэктестом или на демо, внедрение в торговый план — и снова разбор. Гуру, платные сигналы и обещания гарантированной прибыли — мимо. Обмен разборами с сообществом полезен, копирование чужих сделок — нет"
    >
      {({ arrow }) => (
        <>
          <Txt x={10} y={20} size={14} bold>
            Цикл развития
          </Txt>
          {CYCLE_STEPS.map((s) => (
            <g key={s.text}>
              <Box x={s.x} y={s.y} w={w} h={h} tone={s.tone} soft r={10} />
              <Note
                x={s.x + 6}
                y={s.y + 4}
                w={w - 12}
                h={h - 6}
                className="text-center text-[12px]"
              >
                <div className="flex h-[40px] items-center justify-center">{s.text}</div>
              </Note>
            </g>
          ))}
          <Arrow x1={238} y1={64} x2={292} y2={114} arrow={arrow} width={2.5} />
          <Arrow x1={292} y1={168} x2={238} y2={218} arrow={arrow} width={2.5} />
          <Arrow x1={122} y1={220} x2={68} y2={168} arrow={arrow} width={2.5} />
          <Arrow x1={68} y1={114} x2={122} y2={64} arrow={arrow} width={2.5} />
          <Txt x={180} y={140} size={13} bold tone="muted" textAnchor="middle">
            каждый
          </Txt>
          <Txt x={180} y={157} size={13} bold tone="muted" textAnchor="middle">
            месяц
          </Txt>
          <Note x={10} y={256} w={340} h={76} className="text-[12px]">
            <div>
              <span className="text-bear">Мимо:</span> гуру, платные сигналы, «гарантированная
              прибыль».
            </div>
            <div>
              <span className="text-bull">Полезно:</span> разборы с сообществом.{' '}
              <span className="text-text-muted">Копировать чужие сделки — нет.</span>
            </div>
          </Note>
        </>
      )}
    </DiagramSvg>
  );
}
