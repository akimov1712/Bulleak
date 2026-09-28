import { recoveryPct } from '@/lib/trading/drawdown';
import { expectancy } from '@/lib/trading/rr';
import { Arrow, Box, DiagramSvg, Note, Polyline, Txt, type Pt } from './kit';

const pct = (v: number) => Math.round(v).toLocaleString('ru-RU');

const RECOVERY_PILLS = [10, 20, 30, 50, 75, 90] as const;

/** Growth needed to recover from a drawdown: 1 / (1 − d) − 1, a curve that explodes after −50 %. */
export function DrawdownRecovery() {
  const x = (dd: number) => 46 + (dd / 90) * 294;
  const y = (gain: number) => 180 - (gain / 400) * 140;
  const curve: Pt[] = Array.from({ length: 81 }, (_, dd) => [x(dd), y(recoveryPct(dd) ?? 0)]);
  return (
    <DiagramSvg
      width={360}
      height={262}
      title="Кривая восстановления: чтобы вернуться к прежнему балансу после просадки 10 процентов, нужен рост 11 процентов; после 20 — 25; после 30 — 43; после 50 — 100; после 75 — 300; после 90 — 900 процентов. Чем глубже просадка, тем быстрее растёт нужная прибыль, поэтому главное — не допускать глубоких просадок"
    >
      <Txt x={10} y={20} size={14} bold>
        Сколько нужно вернуть после просадки
      </Txt>
      {[0, 100, 200, 300, 400].map((g) => (
        <g key={g}>
          <line x1={46} x2={340} y1={y(g)} y2={y(g)} strokeWidth={1} className="stroke-border" />
          <Txt x={40} y={y(g) + 4} size={11} tone="muted" textAnchor="end">
            {`+${g}`}
          </Txt>
        </g>
      ))}
      {[0, 25, 50, 75].map((dd) => (
        <Txt key={dd} x={x(dd)} y={194} size={11} tone="muted" textAnchor="middle">
          {dd === 0 ? '0 %' : `−${dd} %`}
        </Txt>
      ))}
      <Polyline pts={curve} tone="bear" width={3} />
      {[10, 20, 50, 75].map((dd) => (
        <circle key={dd} cx={x(dd)} cy={y(recoveryPct(dd) ?? 0)} r={4.5} className="fill-bear" />
      ))}
      <Txt x={x(80) - 8} y={y(400) + 4} size={12} bold tone="bear" textAnchor="end">
        −80 % → +400 %
      </Txt>
      {RECOVERY_PILLS.map((dd, i) => {
        const px = 6 + (i % 3) * 117;
        const py = 206 + Math.floor(i / 3) * 29;
        return (
          <g key={dd}>
            <rect
              x={px}
              y={py}
              width={114}
              height={24}
              rx={12}
              className="fill-surface-2 stroke-border"
              strokeWidth={1.5}
            />
            <Txt x={px + 57} y={py + 17} size={12} bold textAnchor="middle">
              <tspan className="fill-bear">{`−${dd} %`}</tspan>
              <tspan className="fill-text-muted"> → </tspan>
              <tspan className="fill-bull">{`+${pct(recoveryPct(dd) ?? 0)} %`}</tspan>
            </Txt>
          </g>
        );
      })}
    </DiagramSvg>
  );
}

const SIZING = [
  { title: 'Узкий стоп 1 %', stop: 59_400, gap: 22 },
  { title: 'Широкий стоп 5 %', stop: 57_000, gap: 100 },
] as const;

/** Same $10 risk with a 1 % and a 5 % stop: the wide stop gets a five times smaller position. */
export function PositionSizing() {
  const entry = 60_000;
  const risk = 10;
  return (
    <DiagramSvg
      width={360}
      height={282}
      title="Депозит 1 000 долларов, риск 1 процент — 10 долларов. Вход по 60 000. Узкий стоп на 59 400, расстояние 600 долларов: количество 10 делить на 600 — 0,0167 BTC, позиция около 1 000 долларов. Широкий стоп на 57 000, расстояние 3 000: количество 0,0033 BTC, позиция около 200 долларов. В обоих случаях при стопе теряется ровно 10 долларов: сначала стоп, потом размер"
    >
      <Txt x={180} y={20} size={14} bold textAnchor="middle">
        Депозит 1 000 $, риск 1 % = 10 $
      </Txt>
      {SIZING.map((s, i) => {
        const x0 = 4 + i * 180;
        const dist = entry - s.stop;
        const qty = risk / dist;
        const eY = 76;
        const sY = eY + s.gap;
        return (
          <g key={s.title}>
            <Box x={x0} y={32} w={172} h={246} tone={i === 0 ? 'info' : 'epic'} soft />
            <Txt x={x0 + 86} y={54} size={13} bold textAnchor="middle">
              {s.title}
            </Txt>
            <line
              x1={x0 + 12}
              x2={x0 + 160}
              y1={eY}
              y2={eY}
              strokeWidth={2}
              className="stroke-info"
            />
            <Txt x={x0 + 160} y={eY - 5} size={12} bold tone="info" textAnchor="end">
              вход 60 000
            </Txt>
            <line
              x1={x0 + 12}
              x2={x0 + 160}
              y1={sY}
              y2={sY}
              strokeWidth={2}
              strokeDasharray="5 4"
              className="stroke-bear"
            />
            <Txt x={x0 + 160} y={sY + 15} size={12} bold tone="bear" textAnchor="end">
              {`стоп ${s.stop.toLocaleString('ru-RU')}`}
            </Txt>
            <line
              x1={x0 + 26}
              x2={x0 + 26}
              y1={eY + 3}
              y2={sY - 3}
              strokeWidth={2}
              className="stroke-text-muted"
            />
            <Txt x={x0 + 34} y={(eY + sY) / 2 + 5} size={12} bold tone="muted">
              {`${dist.toLocaleString('ru-RU')} $`}
            </Txt>
            <Note x={x0 + 8} y={196} w={156} h={80} className="text-center">
              <div className="text-text-muted">{`10 $ ÷ ${dist.toLocaleString('ru-RU')} $ =`}</div>
              <div>{`${qty.toLocaleString('ru-RU', { maximumFractionDigits: 4 })} BTC`}</div>
              <div>{`позиция ≈ ${Math.round(qty * entry).toLocaleString('ru-RU')} $`}</div>
              <div className="text-bear">стоп = −10 $</div>
            </Note>
          </g>
        );
      })}
    </DiagramSvg>
  );
}

const WINRATES = [0.3, 0.4, 0.5, 0.6, 0.7] as const;
const RRS = [1, 1.5, 2, 3] as const;

/** Expectancy in R for win rate × R:R: green cells earn, red lose, yellow ≈ zero. */
export function RrWinrateMatrix() {
  const colW = 72;
  const rowH = 34;
  const fmtR = (e: number) =>
    `${e > 0.001 ? '+' : e < -0.001 ? '−' : ''}${Math.abs(e).toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}R`;
  return (
    <DiagramSvg
      width={360}
      height={274}
      title="Матожидание в R на сделку при разном винрейте и соотношении риск-прибыль. При винрейте 30 процентов прибыльна только 1 к 3; при 40 процентах — 1 к 2 и 1 к 3; при 50 процентах 1 к 1 даёт ноль; при 60 и 70 процентах прибыльны все варианты. Высокий винрейт с плохим R:R и низкий винрейт с хорошим R:R могут дать одинаковый результат"
    >
      <Txt x={10} y={20} size={14} bold>
        Матожидание на сделку, в R
      </Txt>
      <Txt x={10} y={46} size={11} tone="muted">
        W \ R:R
      </Txt>
      {RRS.map((rr, c) => (
        <Txt key={rr} x={62 + c * colW + colW / 2} y={46} size={13} bold textAnchor="middle">
          {`1:${rr.toLocaleString('ru-RU')}`}
        </Txt>
      ))}
      {WINRATES.map((w, r) => {
        const y0 = 56 + r * rowH;
        return (
          <g key={w}>
            <Txt x={14} y={y0 + 22} size={13} bold>
              {`${Math.round(w * 100)} %`}
            </Txt>
            {RRS.map((rr, c) => {
              const e = expectancy(w, rr, 1) ?? 0;
              const tone =
                e > 0.001
                  ? 'fill-bull-soft stroke-bull'
                  : e < -0.001
                    ? 'fill-bear-soft stroke-bear'
                    : 'fill-warn-soft stroke-warn';
              const text = e > 0.001 ? 'fill-bull' : e < -0.001 ? 'fill-bear' : 'fill-warn';
              return (
                <g key={rr}>
                  <rect
                    x={62 + c * colW + 2}
                    y={y0 + 2}
                    width={colW - 4}
                    height={rowH - 4}
                    rx={6}
                    strokeWidth={1.5}
                    className={tone}
                  />
                  <Txt
                    x={62 + c * colW + colW / 2}
                    y={y0 + 22}
                    size={13}
                    bold
                    textAnchor="middle"
                    className={text}
                  >
                    {fmtR(e)}
                  </Txt>
                </g>
              );
            })}
          </g>
        );
      })}
      <Note x={10} y={232} w={340} h={42} className="text-[12px] text-text-muted">
        E = W × R:R − (1 − W) × 1R. Безубыточный винрейт = 1 ÷ (1 + R:R): при 1:2 — 33 %.
      </Note>
    </DiagramSvg>
  );
}

const CORRELATED = ['BTC', 'ETH', 'SOL'] as const;

/** Three correlated longs at 1 % each behave like one 3 % bet on the same market move. */
export function CorrelatedRisk() {
  return (
    <DiagramSvg
      width={360}
      height={262}
      title="Три лонга по 1 процент риска — на BTC, ETH и SOL — выглядят как три разные сделки, но альткоины сильно коррелируют с биткоином. Когда рынок падает, стопы срабатывают вместе, и это минус 3 процента разом. Коррелирующие позиции считают как одну идею; лимит курса — суммарный открытый риск не больше 3 процентов"
    >
      {({ arrow }) => (
        <>
          <Txt x={10} y={20} size={14} bold>
            Три лонга — одна идея
          </Txt>
          {CORRELATED.map((c, i) => {
            const y0 = 38 + i * 52;
            return (
              <g key={c}>
                <Box x={10} y={y0} w={116} h={40} tone="bull" soft />
                <Txt x={68} y={y0 + 25} size={13} bold textAnchor="middle">
                  {`Лонг ${c} · 1 %`}
                </Txt>
                <Arrow
                  x1={130}
                  y1={y0 + 20}
                  x2={196}
                  y2={116}
                  arrow={arrow}
                  tone="bear"
                  width={2.5}
                />
              </g>
            );
          })}
          <Box x={200} y={60} w={150} h={112} tone="bear" soft />
          <Note x={208} y={68} w={134} h={100} className="text-center">
            <div>Рынок падает —</div>
            <div>стопы срабатывают вместе</div>
            <div className="mt-1 text-[18px] font-extrabold text-bear">≈ −3 % разом</div>
          </Note>
          <Note x={10} y={196} w={340} h={64}>
            Лимит курса: суммарный открытый риск ≤ 3 %.{' '}
            <span className="text-text-muted">
              Коррелирующие позиции считай как одну — или выбери лучший сетап.
            </span>
          </Note>
        </>
      )}
    </DiagramSvg>
  );
}
