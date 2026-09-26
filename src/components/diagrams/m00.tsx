import { Arrow, Box, DiagramSvg, Txt } from './kit';

const STYLES = [
  { name: 'Скальпинг', hold: 'секунды–минуты', tf: '1м–5м', load: 'весь день у экрана' },
  { name: 'Интрадей', hold: 'минуты–часы', tf: '5м–1H', load: 'часы в день' },
  { name: 'Свинг', hold: 'дни–недели', tf: '1H–1D', load: '20–40 мин в день', ours: true },
  { name: 'Позиционная', hold: 'недели–месяцы', tf: '1D–1W', load: 'раз в неделю' },
];

/** Trading styles on a holding-time scale; swing (the course style) highlighted. */
export function TradingStyles() {
  const rowH = 62;
  const top = 52;
  return (
    <DiagramSvg
      width={360}
      height={top + STYLES.length * rowH}
      title="Стили трейдинга по времени удержания сделки: скальпинг, интрадей, свинг и позиционная торговля"
    >
      {({ arrow }) => (
        <>
          <Txt x={180} y={18} tone="muted" size={13} textAnchor="middle">
            время удержания сделки
          </Txt>
          <Arrow x1={20} y1={32} x2={340} y2={32} arrow={arrow} />
          <Txt x={20} y={48} tone="muted" size={13}>
            короче
          </Txt>
          <Txt x={340} y={48} tone="muted" size={13} textAnchor="end">
            дольше
          </Txt>
          {STYLES.map((s, i) => {
            const y = top + 6 + i * rowH;
            const tone = s.ours ? 'bull' : 'muted';
            return (
              <g key={s.name}>
                <Box x={4} y={y} w={352} h={rowH - 8} tone={tone} soft={s.ours} />
                <Txt x={16} y={y + 22} bold size={15} tone={s.ours ? 'bull' : 'text'}>
                  {s.name}
                </Txt>
                <Txt x={344} y={y + 22} size={13} tone="muted" textAnchor="end">
                  графики {s.tf}
                </Txt>
                <Txt x={16} y={y + 42} size={13} tone="muted">
                  {s.hold} · {s.load}
                </Txt>
                {s.ours && (
                  <Txt x={344} y={y + 42} size={13} tone="bull" bold textAnchor="end">
                    наш стиль
                  </Txt>
                )}
              </g>
            );
          })}
        </>
      )}
    </DiagramSvg>
  );
}

// Deterministic "realistic" equity: rises overall, with losing streaks and a drawdown.
const REAL = [0, 6, 3, 10, 8, 15, 12, 7, 3, 9, 14, 11, 19, 16, 23, 20, 27, 24, 31, 28, 34];

/** Expected straight-line profit vs a real equity curve with drawdowns. */
export function ExpectationVsReality() {
  const x0 = 28;
  const y0 = 220;
  const dx = 14;
  const scale = 5;
  const real = REAL.map((v, i) => `${x0 + i * dx},${y0 - v * scale}`).join(' ');
  const end = x0 + (REAL.length - 1) * dx;
  const peak = 5;
  const trough = 8;
  return (
    <DiagramSvg
      width={360}
      height={250}
      title="Ожидание: доход растёт ровной линией. Реальность: счёт растёт рывками, с сериями убытков и просадками"
    >
      {({ arrow }) => (
        <>
          <Arrow x1={x0} y1={y0 + 8} x2={x0} y2={14} arrow={arrow} />
          <Arrow x1={x0 - 8} y1={y0} x2={350} y2={y0} arrow={arrow} />
          <Txt x={x0 + 6} y={20} size={13} tone="muted">
            счёт
          </Txt>
          <Txt x={350} y={y0 + 20} size={13} tone="muted" textAnchor="end">
            время
          </Txt>
          <line
            x1={x0}
            y1={y0}
            x2={end}
            y2={40}
            strokeWidth={3}
            strokeDasharray="7 5"
            className="stroke-info"
          />
          <Txt x={end - 8} y={34} tone="info" bold textAnchor="end">
            Ожидание
          </Txt>
          <rect
            x={x0 + peak * dx}
            y={y0 - (REAL[peak] ?? 0) * scale}
            width={(trough - peak) * dx}
            height={((REAL[peak] ?? 0) - (REAL[trough] ?? 0)) * scale}
            rx={4}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            className="fill-bear-soft stroke-bear"
          />
          <polyline
            points={real}
            fill="none"
            strokeWidth={3}
            strokeLinejoin="round"
            className="stroke-bull"
          />
          <Txt x={x0 + 14 * dx} y={y0 - 24} tone="bull" bold textAnchor="middle">
            Реальность
          </Txt>
          <Txt
            x={x0 + 6.5 * dx}
            y={y0 - (REAL[peak] ?? 0) * scale - 8}
            tone="bear"
            size={13}
            textAnchor="middle"
          >
            просадка
          </Txt>
        </>
      )}
    </DiagramSvg>
  );
}

const STEPS = [
  { title: 'Теория', note: 'уроки и тесты', risk: 'без риска' },
  { title: 'Тренажёр', note: 'сделки на истории', risk: 'без риска' },
  { title: 'Демо', note: 'Bybit, журнал', risk: 'виртуально' },
  { title: 'Реальный', note: 'малая сумма', risk: 'свои деньги' },
];

/** Four-step staircase from theory to a real account. */
export function CourseRoadmap() {
  const stepW = 84;
  const base = 250;
  const tones = ['bull', 'bull', 'info', 'warn'] as const;
  return (
    <DiagramSvg
      width={360}
      height={300}
      title="Путь курса из четырёх ступеней: теория, тренажёр, демо-счёт, реальный счёт с минимальной суммой"
    >
      {({ arrow }) => (
        <>
          <Txt x={180} y={18} textAnchor="middle" size={13} tone="muted">
            Переход дальше — только по правилам
          </Txt>
          {STEPS.map((s, i) => {
            const x = 6 + i * (stepW + 4);
            const top = base - (90 + i * 40);
            const tone = tones[i] ?? 'bull';
            return (
              <g key={s.title}>
                <Box x={x} y={top} w={stepW} h={base - top} tone={tone} soft r={10} />
                <Txt x={x + stepW / 2} y={top + 26} textAnchor="middle" bold size={20} tone={tone}>
                  {i + 1}
                </Txt>
                <Txt x={x + stepW / 2} y={top + 50} textAnchor="middle" bold size={14}>
                  {s.title}
                </Txt>
                <foreignObject x={x + 4} y={top + 56} width={stepW - 8} height={34}>
                  <div className="text-center text-[13px] leading-tight font-semibold text-text-muted">
                    {s.note}
                  </div>
                </foreignObject>
                <Txt
                  x={x + stepW / 2}
                  y={base + 18}
                  textAnchor="middle"
                  size={13}
                  tone={i === 3 ? 'warn' : 'muted'}
                >
                  {s.risk}
                </Txt>
              </g>
            );
          })}
          <Arrow x1={10} y1={base + 32} x2={350} y2={base + 32} arrow={arrow} tone="warn" />
          <Txt x={350} y={base + 48} textAnchor="end" size={13} tone="warn">
            риск растёт
          </Txt>
        </>
      )}
    </DiagramSvg>
  );
}
