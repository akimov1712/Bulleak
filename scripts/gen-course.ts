/**
 * Generates src/content/course.ts from the lesson briefs in docs/03-content/module-XX/lesson-YY.md.
 * The briefs are the source of truth for titles, timing, terms and goals; module metadata lives here.
 * Usage: npx tsx scripts/gen-course.ts
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const BRIEFS = path.join(ROOT, 'docs/03-content');
const OUT = path.join(ROOT, 'src/content/course.ts');

const MODULES = [
  [
    'm00',
    'Старт',
    'Что такое трейдинг, чего ждать и как устроен путь к реальной торговле.',
    'rocket',
    'green',
    false,
  ],
  [
    'm01',
    'Основы крипты',
    'Блокчейн, биткоин, альткоины, ликвидность и безопасность средств.',
    'bitcoin',
    'blue',
    true,
  ],
  [
    'm02',
    'Bybit с нуля',
    'Аккаунт, защита, счета, терминал, ордера, комиссии и демо-торговля.',
    'building-2',
    'orange',
    true,
  ],
  [
    'm03',
    'Чтение графика',
    'Свечи, таймфреймы, тренд, уровни и объём.',
    'candlestick-chart',
    'purple',
    true,
  ],
  [
    'm04',
    'Паттерны и фигуры',
    'Свечные паттерны, фигуры разворота и продолжения, трендовые линии.',
    'shapes',
    'pink',
    true,
  ],
  [
    'm05',
    'Индикаторы',
    'Скользящие средние, RSI, MACD, Боллинджер, ATR и их ловушки.',
    'activity',
    'teal',
    true,
  ],
  [
    'm06',
    'Продвинутый теханализ',
    'Мультитаймфрейм, Фибоначчи, ликвидность, пробои и дивергенции.',
    'layers',
    'blue',
    true,
  ],
  [
    'm07',
    'Фундаментал и контекст',
    'Новости и макро, циклы биткоина, сентимент и данные деривативов.',
    'newspaper',
    'yellow',
    true,
  ],
  [
    'm08',
    'Фьючерсы и плечо',
    'Бессрочные контракты, лонг и шорт, маржа, ликвидация и funding.',
    'zap',
    'red',
    true,
  ],
  [
    'm09',
    'Риск-менеджмент',
    'Правило 1%, размер позиции, R:R, матожидание, просадки и лимиты.',
    'shield',
    'green',
    true,
  ],
  [
    'm10',
    'Психология',
    'Эмоции, дисциплина, торговый план и журнал сделок.',
    'brain',
    'purple',
    true,
  ],
  [
    'm11',
    'Своя свинг-стратегия',
    'Собираем стратегию, тестируем на истории и на демо-счёте.',
    'target',
    'orange',
    true,
  ],
  [
    'm12',
    'Выход на рынок',
    'Проверка готовности, первый депозит, масштабирование и учёт.',
    'flag',
    'teal',
    true,
  ],
] as const;

interface ParsedLesson {
  id: string;
  moduleId: string;
  index: number;
  title: string;
  summary: string;
  minutes: number;
  terms: string[];
  practice?: string;
}

function section(md: string, heading: string): string {
  const start = md.indexOf(`## ${heading}`);
  if (start === -1) return '';
  const rest = md.slice(start + heading.length + 3);
  const end = rest.search(/\n## /);
  return end === -1 ? rest : rest.slice(0, end);
}

function practiceOf(text: string): string | undefined {
  const t = text.toLowerCase();
  if (t.includes('тренажёр') || t.includes('сценари')) return 'simulator';
  if (t.includes('журнал')) return 'journal';
  if (t.includes('calcembed') || t.includes('калькулятор')) return 'calculator';
  if (t.includes('candlechart')) return 'chart';
  return undefined;
}

function parseBrief(file: string, moduleId: string, index: number): ParsedLesson {
  const md = fs.readFileSync(file, 'utf8');
  const header = md.match(/^# (m\d\d-l\d\d) · (.+)$/m);
  if (!header) throw new Error(`No header in ${file}`);
  const [, id = '', title = ''] = header;
  const minutes = Number(md.match(/\*\*Время:\*\* ~(\d+)/)?.[1] ?? 10);
  const practiceLine = md.match(/\*\*Практика:\*\* ([^\n]+)/)?.[1] ?? '';
  const goals = section(md, 'Цели')
    .split('\n')
    .map((l) => l.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);
  // Briefs use Markdown; the app shows plain text.
  const plain = (text: string) => text.replace(/\*\*|__|`/g, '').trim();
  const firstGoal = plain(goals[0] ?? title);
  const summary = firstGoal.endsWith('.') ? firstGoal : `${firstGoal}.`;
  const terms = [...section(md, 'Термины').matchAll(/`([a-z0-9-]+)`/g)].map((m) => m[1] ?? '');
  return {
    id,
    moduleId,
    index,
    title,
    summary,
    minutes,
    terms,
    practice: practiceOf(practiceLine),
  };
}

const modules = MODULES.map(([id, title, description, icon, color, hasExam], moduleIndex) => {
  const dir = path.join(BRIEFS, `module-${id.slice(1)}`);
  const files = fs
    .readdirSync(dir)
    .filter((f) => /^lesson-\d\d\.md$/.test(f))
    .sort();
  const lessons = files.map((f, i) => parseBrief(path.join(dir, f), id, i + 1));
  return { id, index: moduleIndex, title, description, icon, color, hasExam, lessons };
});

const lessonCount = modules.reduce((n, m) => n + m.lessons.length, 0);

const q = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const body = modules
  .map((m) => {
    const lessons = m.lessons
      .map((l) =>
        [
          '      {',
          `        id: ${q(l.id)},`,
          `        moduleId: ${q(l.moduleId)},`,
          `        index: ${l.index},`,
          `        title: ${q(l.title)},`,
          `        summary: ${q(l.summary)},`,
          `        minutes: ${l.minutes},`,
          `        terms: [${l.terms.map(q).join(', ')}],`,
          l.practice ? `        practice: ${q(l.practice)},` : null,
          '      },',
        ]
          .filter((x) => x !== null)
          .join('\n'),
      )
      .join('\n');
    return [
      '  {',
      `    id: ${q(m.id)},`,
      `    index: ${m.index},`,
      `    title: ${q(m.title)},`,
      `    description: ${q(m.description)},`,
      `    icon: ${q(m.icon)},`,
      `    color: ${q(m.color)},`,
      `    hasExam: ${m.hasExam},`,
      '    lessons: [',
      lessons,
      '    ],',
      '  },',
    ].join('\n');
  })
  .join('\n');

const out = `// GENERATED by scripts/gen-course.ts from docs/03-content briefs — do not edit by hand.
// ${modules.length} modules, ${lessonCount} lessons.
import type { CourseModule } from '@/types/course';

export const course: CourseModule[] = [
${body}
];
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out, 'utf8');
console.log(`course.ts: ${modules.length} modules, ${lessonCount} lessons`);
