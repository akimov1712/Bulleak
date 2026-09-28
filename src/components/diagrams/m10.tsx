import { Box, DiagramSvg, Note, Txt, type Pt } from './kit';
import type { DiagramTone } from './tones';

type Seg = readonly [Pt, Pt, Pt, Pt];

const bezier = ([p0, p1, p2, p3]: Seg, t: number): Pt => {
  const u = 1 - t;
  const f = (i: 0 | 1) =>
    u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i];
  return [f(0), f(1)];
};

const CYCLE: readonly Seg[] = [
  [
    [16, 204],
    [66, 199],
    [100, 74],
    [135, 74],
  ],
  [
    [135, 74],
    [175, 74],
    [215, 236],
    [262, 233],
  ],
  [
    [262, 233],
    [295, 231],
    [318, 206],
    [344, 182],
  ],
];

interface Mood {
  seg: 0 | 1 | 2;
  t: number;
  text: string;
  tone: DiagramTone;
  anchor: 'start' | 'middle' | 'end';
  dx: number;
  dy: number;
}

const MOODS: readonly Mood[] = [
  { seg: 0, t: 0.3, text: 'Оптимизм', tone: 'bull', anchor: 'start', dx: 8, dy: 16 },
  { seg: 0, t: 0.7, text: 'Азарт', tone: 'bull', anchor: 'end', dx: -8, dy: 4 },
  { seg: 0, t: 1, text: 'Эйфория', tone: 'warn', anchor: 'middle', dx: 0, dy: -12 },
  { seg: 1, t: 0.22, text: 'Тревога', tone: 'text', anchor: 'start', dx: 8, dy: 0 },
  { seg: 1, t: 0.45, text: 'Отрицание', tone: 'text', anchor: 'start', dx: 8, dy: 0 },
  { seg: 1, t: 0.7, text: 'Паника', tone: 'bear', anchor: 'start', dx: 9, dy: 0 },
  { seg: 1, t: 1, text: 'Капитуляция', tone: 'bear', anchor: 'middle', dx: 0, dy: 22 },
  { seg: 2, t: 0.45, text: 'Уныние', tone: 'muted', anchor: 'start', dx: 6, dy: 18 },
  { seg: 2, t: 1, text: 'Надежда', tone: 'info', anchor: 'end', dx: 0, dy: -12 },
];

/** Emotions along a market cycle: the crowd buys on euphoria and sells on capitulation. */
export function EmotionCycle() {
  const pt = ([x, y]: Pt) => `${x},${y}`;
  const d = `M${pt(CYCLE[0]?.[0] ?? [0, 0])} ${CYCLE.map(
    ([, c1, c2, end]) => `C${pt(c1)} ${pt(c2)} ${pt(end)}`,
  ).join(' ')}`;
  return (
    <DiagramSvg
      width={360}
      height={306}
      title="Цикл эмоций рынка: на росте — оптимизм, азарт и эйфория на вершине; на падении — тревога, отрицание, паника и капитуляция на дне; затем уныние и надежда. Толпа покупает на эйфории у максимумов и продаёт в панике у минимумов. Правила торгового плана нужны, чтобы не действовать так же"
    >
      <Txt x={10} y={20} size={14} bold>
        Цикл эмоций рынка
      </Txt>
      <path d={d} fill="none" strokeWidth={3} strokeLinecap="round" className="stroke-text" />
      {MOODS.map((m) => {
        const seg = CYCLE[m.seg];
        if (!seg) return null;
        const [x, y] = bezier(seg, m.t);
        const fill =
          m.tone === 'bull'
            ? 'fill-bull'
            : m.tone === 'bear'
              ? 'fill-bear'
              : m.tone === 'warn'
                ? 'fill-warn'
                : m.tone === 'info'
                  ? 'fill-info'
                  : 'fill-text-muted';
        return (
          <g key={m.text}>
            <circle cx={x} cy={y} r={5} className={fill} />
            <Txt x={x + m.dx} y={y + m.dy} size={13} bold tone={m.tone} textAnchor={m.anchor}>
              {m.text}
            </Txt>
          </g>
        );
      })}
      <Note x={10} y={264} w={340} h={42} className="text-[12px]">
        <span className="text-warn">На эйфории</span> толпа покупает,{' '}
        <span className="text-bear">на капитуляции</span> — продаёт. Правила плана не дают
        действовать так же.
      </Note>
    </DiagramSvg>
  );
}

const ROUTINE = [
  {
    when: 'Утро · 15–20 мин',
    what: 'Обзор 1D → 4H, отметить зоны, поставить алерты на уровни.',
    tone: 'warn',
  },
  {
    when: 'День',
    what: 'Графики закрыты. Сработал алерт → чек-лист перед сделкой → решение по плану.',
    tone: 'info',
  },
  {
    when: 'Вечер · 10 мин',
    what: 'Проверить позиции и стопы, записать сделки в журнал.',
    tone: 'epic',
  },
  {
    when: 'Выходные · 30 мин',
    what: 'Разбор недели: соблюдал ли правила, одно улучшение.',
    tone: 'bull',
  },
] as const;

/** A swing trader's day: short morning review, alerts instead of screen time, evening journal. */
export function DailyRoutine() {
  const step = 70;
  return (
    <DiagramSvg
      width={360}
      height={330}
      title="Распорядок свинг-трейдера. Утро, 15–20 минут: обзор дневного и 4-часового графика, отметить зоны, поставить алерты. День: графики закрыты, при срабатывании алерта — чек-лист перед сделкой и решение по плану. Вечер, 10 минут: проверить позиции и стопы, записать сделки в журнал. Выходные, 30 минут: разбор недели и одно улучшение"
    >
      <Txt x={10} y={20} size={14} bold>
        День свинг-трейдера
      </Txt>
      <line x1={26} x2={26} y1={50} y2={50 + step * 3} strokeWidth={3} className="stroke-border" />
      {ROUTINE.map((r, i) => {
        const y = 50 + i * step;
        const stroke =
          r.tone === 'warn'
            ? 'fill-warn-soft stroke-warn'
            : r.tone === 'info'
              ? 'fill-info-soft stroke-info'
              : r.tone === 'epic'
                ? 'fill-epic-soft stroke-epic'
                : 'fill-bull-soft stroke-bull';
        return (
          <g key={r.when}>
            <circle cx={26} cy={y} r={10} strokeWidth={3} className={stroke} />
            <Txt x={48} y={y + 5} size={14} bold tone={r.tone}>
              {r.when}
            </Txt>
            <Note x={48} y={y + 12} w={304} h={52} className="text-text-muted">
              {r.what}
            </Note>
          </g>
        );
      })}
    </DiagramSvg>
  );
}

const QUADRANTS = [
  {
    row: 0,
    col: 0,
    tone: 'bull',
    title: 'Заслуженный успех',
    text: 'Повторяй процесс.',
  },
  {
    row: 0,
    col: 1,
    tone: 'info',
    title: 'Хорошая сделка',
    text: 'Убыток — часть статистики. Ничего не меняй.',
  },
  {
    row: 1,
    col: 0,
    tone: 'warn',
    title: 'Опасное везение',
    text: 'Закрепляет плохую привычку. Разбери как ошибку.',
  },
  {
    row: 1,
    col: 1,
    tone: 'bear',
    title: 'Заслуженный урок',
    text: 'Найди правило, которое нарушил.',
  },
] as const;

/** Process × outcome: judge a trade by whether the rules were followed, not by its P&L. */
export function ProcessOutcomeMatrix() {
  const x0 = 72;
  const w = 138;
  const h = 102;
  return (
    <DiagramSvg
      width={360}
      height={270}
      title="Матрица процесс на результат. Сделка по правилам с прибылью — заслуженный успех. По правилам с убытком — всё равно хорошая сделка, убыток часть статистики. Против правил с прибылью — опасное везение, оно закрепляет плохую привычку. Против правил с убытком — заслуженный урок. Сделку оценивают по соблюдению правил, а не по результату"
    >
      <Txt x={x0 + w / 2} y={44} size={14} bold tone="bull" textAnchor="middle">
        Прибыль
      </Txt>
      <Txt x={x0 + w + 4 + w / 2} y={44} size={14} bold tone="bear" textAnchor="middle">
        Убыток
      </Txt>
      <Txt x={10} y={20} size={14} bold>
        Процесс × результат
      </Txt>
      {['По правилам', 'Против правил'].map((label, r) => (
        <Note key={label} x={4} y={56 + r * (h + 4) + 34} w={64} h={40} className="text-[12px]">
          {label}
        </Note>
      ))}
      {QUADRANTS.map((q) => {
        const x = x0 + q.col * (w + 4);
        const y = 56 + q.row * (h + 4);
        return (
          <g key={q.title}>
            <Box x={x} y={y} w={w} h={h} tone={q.tone} soft />
            <Note x={x + 8} y={y + 8} w={w - 16} h={h - 12}>
              <div className="mb-1 text-[14px] font-extrabold">{q.title}</div>
              <div className="text-[12px] text-text-muted">{q.text}</div>
            </Note>
          </g>
        );
      })}
    </DiagramSvg>
  );
}
