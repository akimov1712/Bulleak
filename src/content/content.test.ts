/**
 * Content validation (docs/02-architecture/content-pipeline.md → «Валидация»).
 * Strict since T-828: the course is complete, so every lesson, quiz, module exam, the final
 * exam and the glossary are checked for completeness and cross-references.
 */
import { describe, expect, it } from 'vitest';
import type { Question, Quiz } from '@/types/quiz';
import type { LessonId, ModuleId } from '@/types/course';
import { contentInventory } from './loaders';
import { courseIndex } from './courseIndex';
import { getTerm, glossary } from './glossary';
import { moduleLessonOfTag, questionLesson } from '@/lib/quiz/exam';
import fs from 'node:fs';
import path from 'node:path';
import { isDatasetName, type DatasetName } from '@/lib/trading/candles';
import { isDiagramName } from '@/components/diagrams/registry';
import { isCalculatorId } from '@/features/calculators/registry';
import { getScenario } from './scenarios';
import { finalExam } from './final-exam';
import { mdxComponents } from '@/features/lesson/mdxComponents';
import { MOODS } from '@/components/mascot/moods';
import { skillGroups, skillIndex, skills } from './skills';
import { skillGraphProblems } from '@/lib/learner/skills';
import { BEHAVIOUR_RULES } from '@/lib/learner/behaviour';

const datasetLengths = new Map<DatasetName, number>();
function datasetLength(name: DatasetName): number {
  let length = datasetLengths.get(name);
  if (length === undefined) {
    const raw = fs.readFileSync(path.resolve('public/data', `${name}.json`), 'utf8');
    length = (JSON.parse(raw) as { candles: unknown[] }).candles.length;
    datasetLengths.set(name, length);
  }
  return length;
}

// Raw MDX text (the Vite MDX plugin compiles even ?raw imports, so read from disk).
const mdxSources = Object.fromEntries(
  contentInventory.lessons.map((id) => {
    const [moduleId, lessonPart] = id.split('-');
    const file = path.resolve('src/content/modules', moduleId ?? '', lessonPart ?? '', 'index.mdx');
    return [id, fs.readFileSync(file, 'utf8')];
  }),
) as Record<LessonId, string>;

/** Modules whose lesson tests follow the 2026-11-11 rules (no obvious questions). */
const QUIZ_V2_MODULES = new Set<string>([
  'm00',
  'm01',
  'm02',
  'm03',
  'm04',
  'm05',
  'm06',
  'm07',
  'm08',
]);

/** Problems with one question (empty list = valid). */
export function questionProblems(q: Question): string[] {
  const p: string[] = [];
  if (!q.prompt.trim()) p.push('empty prompt');
  if (q.explanation.trim().length < 15) p.push('explanation too short');
  if (q.tags.length < 1 || q.tags.length > 3) p.push('needs 1–3 tags');
  switch (q.type) {
    case 'single':
    case 'multi': {
      const ids = q.options.map((o) => o.id);
      if (new Set(ids).size !== ids.length) p.push('duplicate option ids');
      if (q.options.length < 2) p.push('needs ≥2 options');
      if (q.options.some((o) => !o.text.trim())) p.push('empty option text');
      const correct = q.type === 'single' ? [q.correct] : q.correct;
      if (correct.length === 0) p.push('no correct option');
      if (correct.some((c) => !ids.includes(c))) p.push('correct id not among options');
      if (q.type === 'multi' && q.options.length < 3) p.push('multi needs ≥3 options');
      break;
    }
    case 'numeric':
      if (!Number.isFinite(q.correct)) p.push('correct is not a number');
      if (!(q.tolerance >= 0)) p.push('tolerance must be ≥0');
      break;
    case 'match': {
      if (q.pairs.length < 3 || q.pairs.length > 5) p.push('match needs 3–5 pairs');
      if (new Set(q.pairs.map((x) => x.left)).size !== q.pairs.length)
        p.push('duplicate left items');
      if (new Set(q.pairs.map((x) => x.right)).size !== q.pairs.length)
        p.push('duplicate right items');
      break;
    }
    case 'order':
      if (q.items.length < 3 || q.items.length > 6) p.push('order needs 3–6 items');
      if (new Set(q.items).size !== q.items.length) p.push('duplicate items');
      break;
    case 'chart-click':
      if (!isDatasetName(q.dataset)) p.push(`unknown dataset "${q.dataset}"`);
      else if (q.to >= datasetLength(q.dataset)) p.push('range goes past the end of the dataset');
      if (!(q.from < q.to)) p.push('from must be < to');
      if (q.to - q.from + 1 > 150) p.push('chart shows more than 150 candles');
      if (q.target.kind === 'candle' && q.target.indices.some((i) => i < q.from || i > q.to))
        p.push('target candle outside the shown range');
      if (q.target.kind === 'price' && !(q.target.min < q.target.max)) p.push('price range empty');
      if (q.target.kind === 'candle' && q.target.indices.length === 0) p.push('no target candles');
      break;
    case 'truefalse':
      break;
  }
  return p;
}

function quizProblems(quiz: Quiz, expectedId: string, kind: Quiz['kind']): string[] {
  const p: string[] = [];
  if (quiz.id !== expectedId) p.push(`id "${quiz.id}" ≠ "${expectedId}"`);
  if (quiz.kind !== kind) p.push(`kind "${quiz.kind}" ≠ "${kind}"`);
  if (kind === 'lesson') {
    if (quiz.questions.length < 5 || quiz.questions.length > 12)
      p.push('lesson quiz needs 5–12 questions');
    // Content guidelines (2026-11-11): true/false only for one common misconception per test.
    // Enforced per module as tests are reworked; the list goes away when all 13 are done.
    if (
      QUIZ_V2_MODULES.has(expectedId.slice(0, 3)) &&
      quiz.questions.filter((q) => q.type === 'truefalse').length > 1
    )
      p.push('at most one true/false question per lesson test');
    if (quiz.passRatio !== 0.8) p.push('lesson pass ratio must be 0.8');
  } else {
    if (!quiz.sample) p.push('exam needs sample');
    else if (quiz.questions.length < quiz.sample) p.push('pool smaller than sample');
  }
  if (new Set(quiz.questions.map((q) => q.type)).size < 2) p.push('needs ≥2 question types');
  for (const q of quiz.questions) {
    for (const problem of questionProblems(q)) p.push(`${q.id}: ${problem}`);
  }
  return p;
}

describe('content inventory', () => {
  it('every content file belongs to a lesson/module of the course', () => {
    for (const id of [...contentInventory.lessons, ...contentInventory.quizzes]) {
      expect(courseIndex.getLesson(id), `unknown lesson ${id}`).toBeDefined();
    }
    for (const id of contentInventory.exams) {
      expect(courseIndex.getModule(id)?.hasExam, `module ${id} has no exam`).toBe(true);
    }
  });

  it('lesson text and quiz always come together', () => {
    expect([...contentInventory.lessons].sort()).toEqual([...contentInventory.quizzes].sort());
  });

  it('all 62 lessons and all module exams exist', () => {
    expect(contentInventory.lessons).toHaveLength(courseIndex.lessons.length);
    const withExam = courseIndex.modules.filter((m) => m.hasExam).map((m) => m.id);
    expect([...contentInventory.exams].sort()).toEqual(withExam.sort());
  });
});

describe('lesson quizzes', () => {
  const allIds = new Map<string, string>();

  it.each(contentInventory.quizzes)('%s quiz is valid', async (id) => {
    const quiz = await contentInventory.loadQuiz(id);
    expect(quizProblems(quiz, id, 'lesson')).toEqual([]);
    for (const q of quiz.questions) {
      expect(q.id.startsWith(`${id}-q`), `${q.id} should start with ${id}-q`).toBe(true);
      expect(allIds.get(q.id), `duplicate question id ${q.id}`).toBeUndefined();
      allIds.set(q.id, id);
    }
  });
});

describe('module exams', () => {
  it.each(contentInventory.exams)('%s exam is valid', async (id: ModuleId) => {
    const exam = await contentInventory.loadExam(id);
    expect(quizProblems(exam, id, 'exam')).toEqual([]);
  });

  it.each(contentInventory.exams)(
    '%s exam covers every lesson of the module with ≥3 questions',
    async (id: ModuleId) => {
      const exam = await contentInventory.loadExam(id);
      const lessons = courseIndex.getModule(id)?.lessons.map((l) => l.id) ?? [];
      const lessonOfTag = moduleLessonOfTag(
        courseIndex.getModule(id)?.lessons ?? [],
        (tag) => getTerm(tag)?.lessonId as LessonId | undefined,
      );
      const perLesson = new Map<string, number>();
      for (const q of exam.questions) {
        const lesson = questionLesson(q, lessonOfTag);
        expect(
          lesson && lessons.includes(lesson),
          `${q.id}: first tag must be a term of this module`,
        ).toBe(true);
        if (lesson) perLesson.set(lesson, (perLesson.get(lesson) ?? 0) + 1);
      }
      for (const lesson of lessons) {
        expect(perLesson.get(lesson) ?? 0, `${lesson} questions in exam`).toBeGreaterThanOrEqual(3);
      }
    },
  );
});

describe('final exam', () => {
  it('is a valid exam pooled from unique questions', () => {
    expect(quizProblems(finalExam, 'final', 'exam')).toEqual([]);
    const ids = finalExam.questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('question tags', () => {
  it('every tag of every lesson quiz and exam is a glossary term', async () => {
    const quizzes = [
      ...(await Promise.all(contentInventory.quizzes.map((id) => contentInventory.loadQuiz(id)))),
      ...(await Promise.all(contentInventory.exams.map((id) => contentInventory.loadExam(id)))),
    ];
    const unknown = quizzes.flatMap((quiz) =>
      quiz.questions.flatMap((q) => q.tags.filter((t) => !getTerm(t)).map((t) => `${q.id}: ${t}`)),
    );
    expect(unknown).toEqual([]);
  });
});

describe('skill graph', () => {
  it('is valid: no cycles, known prerequisites, known groups and lessons, terms as tags', () => {
    expect(skillGraphProblems(skills)).toEqual([]);
    const groups = new Set(skillGroups.map((g) => g.id));
    const problems = skills.flatMap((s) => [
      ...(groups.has(s.group) ? [] : [`${s.id}: unknown group ${s.group}`]),
      ...s.lessons
        .filter((l) => !courseIndex.getLesson(l))
        .map((l) => `${s.id}: unknown lesson ${l}`),
      ...s.tags.filter((t) => !getTerm(t)).map((t) => `${s.id}: tag ${t} is not a term`),
    ]);
    expect(problems).toEqual([]);
    expect(skills.length).toBeGreaterThanOrEqual(25);
  });

  it('every behaviour rule measures a skill of the graph', () => {
    const unknown = BEHAVIOUR_RULES.filter((r) => !skillIndex.getSkill(r.skill)).map((r) => r.id);
    expect(unknown).toEqual([]);
  });

  it('every question maps to a skill, every skill has questions, its lessons test it', async () => {
    const lessonQuizzes = await Promise.all(
      contentInventory.quizzes.map((id) => contentInventory.loadQuiz(id)),
    );
    const exams = await Promise.all(
      contentInventory.exams.map((id) => contentInventory.loadExam(id)),
    );
    const questions = [...lessonQuizzes, ...exams, finalExam].flatMap((quiz) => quiz.questions);

    const unmapped = questions.filter((q) => skillIndex.skillsOfTags(q.tags).length === 0);
    expect(unmapped.map((q) => q.id)).toEqual([]);

    const perSkill = new Map<string, number>();
    for (const q of questions) {
      for (const s of skillIndex.skillsOfTags(q.tags)) perSkill.set(s, (perSkill.get(s) ?? 0) + 1);
    }
    const thin = skills.filter((s) => (perSkill.get(s.id) ?? 0) < 5).map((s) => s.id);
    expect(thin, 'skills with fewer than 5 questions').toEqual([]);

    const quizOf = new Map(lessonQuizzes.map((quiz) => [quiz.id, quiz]));
    const untested = skills.flatMap((s) =>
      s.lessons
        .filter(
          (l) => !quizOf.get(l)?.questions.some((q) => q.tags.some((t) => s.tags.includes(t))),
        )
        .map((l) => `${s.id}: ${l}`),
    );
    expect(untested, 'skill lessons whose quiz does not test the skill').toEqual([]);
  });
});

describe('glossary', () => {
  it('every term points at a real lesson', () => {
    const bad = glossary.filter((t) => !courseIndex.getLesson(t.lessonId)).map((t) => t.id);
    expect(bad).toEqual([]);
  });
});

describe('why it matters and typical mistakes (T-2206)', () => {
  it('every lesson says why it matters and warns about a typical mistake', () => {
    const noWhy = courseIndex.lessons.filter((l) => l.why.trim().length < 30).map((l) => l.id);
    expect(noWhy).toEqual([]);
    const noWarning = contentInventory.lessons.filter(
      (id) => !mdxSources[id]?.includes('<Warning'),
    );
    expect(noWarning).toEqual([]);
  });
});

describe('lesson texts and glossary links', () => {
  it.each(contentInventory.lessons)('%s: terms exist in the glossary', (id) => {
    const lesson = courseIndex.getLesson(id);
    const missing = (lesson?.terms ?? []).filter((t) => !getTerm(t));
    expect(missing, 'terms from the brief missing in glossary.ts').toEqual([]);

    const source = mdxSources[id] ?? '';
    const usedInText = [...source.matchAll(/<Term\s+id="([^"]+)"/g)].map((m) => m[1] ?? '');
    expect(
      usedInText.filter((t) => !getTerm(t)),
      '<Term id> without glossary entry',
    ).toEqual([]);
  });

  it.each(contentInventory.lessons)('%s: diagrams and charts reference real assets', (id) => {
    const source = mdxSources[id] ?? '';
    const diagrams = [...source.matchAll(/<Diagram\s+name="([^"]+)"/g)].map((m) => m[1] ?? '');
    expect(
      diagrams.filter((d) => !isDiagramName(d)),
      '<Diagram name> not in the registry',
    ).toEqual([]);
    const datasets = [...source.matchAll(/<CandleChart\s[^>]*dataset="([^"]+)"/g)].map(
      (m) => m[1] ?? '',
    );
    expect(
      datasets.filter((d) => !isDatasetName(d)),
      '<CandleChart dataset> unknown',
    ).toEqual([]);
    const calcs = [...source.matchAll(/<CalcEmbed\s+id="([^"]+)"/g)].map((m) => m[1] ?? '');
    expect(
      calcs.filter((c) => !isCalculatorId(c)),
      '<CalcEmbed id> unknown',
    ).toEqual([]);
    const scenarios = [...source.matchAll(/<SimScenario\s+id="([^"]+)"/g)].map((m) => m[1] ?? '');
    expect(
      scenarios.filter((s) => !getScenario(s)),
      '<SimScenario id> unknown',
    ).toEqual([]);
  });

  it('asset checks above actually match something (guards against broken regexes)', () => {
    const all = Object.values(mdxSources).join('\n');
    expect(all).toMatch(/<Diagram\s+name="/);
    expect(all).toMatch(/<CandleChart\s[^>]*dataset="/);
    expect(all).toMatch(/<CalcEmbed\s+id="/);
    expect(all).toMatch(/<SimScenario\s+id="/);
    expect(all).toMatch(/mood="/);
    expect(all).toMatch(/<Checklist\s[^>]*id="/);
  });

  it.each(contentInventory.lessons)('%s: components and mascot moods exist', (id) => {
    const source = mdxSources[id] ?? '';
    const components = [...source.matchAll(/<([A-Z][A-Za-z]+)[\s/>]/g)].map((m) => m[1] ?? '');
    expect(
      components.filter((c) => !(c in mdxComponents)),
      'unknown MDX component',
    ).toEqual([]);
    const moods = [...source.matchAll(/mood="([^"]+)"/g)].map((m) => m[1] ?? '');
    expect(
      moods.filter((m) => !(m in MOODS)),
      'unknown mascot mood',
    ).toEqual([]);
  });

  it('checklist ids are unique across lessons (they key saved ticks)', () => {
    const ids = Object.values(mdxSources).flatMap((src) =>
      [...src.matchAll(/<Checklist\s[^>]*id="([^"]+)"/g)].map((m) => m[1] ?? ''),
    );
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it.each(contentInventory.lessons)('%s: has Goals and Summary blocks', (id) => {
    const source = mdxSources[id] ?? '';
    expect(source).toMatch(/<Goals[\s>]/);
    expect(source).toMatch(/<Summary[\s>]/);
  });
});

describe('questionProblems (validator self-test)', () => {
  const base = {
    id: 'x',
    prompt: 'Вопрос?',
    explanation: 'Достаточно длинное объяснение.',
    tags: ['t'],
  };

  it('accepts a well-formed question', () => {
    expect(questionProblems({ ...base, type: 'truefalse', correct: true })).toEqual([]);
  });

  it('catches typical authoring mistakes', () => {
    expect(
      questionProblems({
        ...base,
        type: 'single',
        options: [
          { id: 'a', text: 'A' },
          { id: 'b', text: 'B' },
        ],
        correct: 'z',
      }),
    ).toContain('correct id not among options');
    expect(
      questionProblems({ ...base, explanation: '', type: 'truefalse', correct: true }),
    ).toContain('explanation too short');
    expect(questionProblems({ ...base, type: 'numeric', correct: 1, tolerance: -1 })).toContain(
      'tolerance must be ≥0',
    );
    expect(questionProblems({ ...base, type: 'order', items: ['a', 'a', 'b'] })).toContain(
      'duplicate items',
    );
    expect(
      questionProblems({ ...base, type: 'match', pairs: [{ left: 'a', right: 'b' }] }),
    ).toContain('match needs 3–5 pairs');
  });
});
