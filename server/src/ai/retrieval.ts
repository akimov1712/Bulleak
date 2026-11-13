/**
 * Search over the course index (T-2105): BM25 with a light Russian stemmer. The best excerpts go
 * into the model's instructions, so answers follow the lessons and cost fewer tokens.
 */
import { readFileSync } from 'node:fs';
import { courseIndexFileSchema, type CourseChunk } from '@bulleak/shared';

const STOP_WORDS = new Set(
  (
    'и в во не что он на я с со как а то все она так его но да ты к у же вы за бы по только ее мне ' +
    'было вот от меня еще нет о из ему теперь когда даже ну вдруг ли если уже или ни быть был него до ' +
    'вас нибудь опять уж вам ведь там потом себя ничего ей может они тут где есть надо ней для мы тебя ' +
    'их чем была сам чтоб без будто чего раз тоже себе под будет ж тогда кто этот того потому этого ' +
    'какой совсем ним здесь этом один почти мой тем чтобы нее сейчас были куда зачем всех никогда ' +
    'можно при наконец два об другой хоть после над больше тот через эти нас про всего них какая много ' +
    'разве три эту моя впрочем хорошо свою этой перед иногда лучше чуть том нельзя такой им более всегда ' +
    'конечно всю между это такое объясни расскажи скажи простыми словами пожалуйста почему зачем ' +
    'нужно мне мой моя the a an is of to and what how'
  ).split(' '),
);

const ENDINGS = [
  'иями',
  'ями',
  'ами',
  'ого',
  'его',
  'ому',
  'ему',
  'ыми',
  'ими',
  'иях',
  'ией',
  'ость',
  'ости',
  'ах',
  'ях',
  'ов',
  'ев',
  'ей',
  'ой',
  'ий',
  'ый',
  'ая',
  'яя',
  'ое',
  'ее',
  'ом',
  'ем',
  'ам',
  'ям',
  'ую',
  'юю',
  'ые',
  'ие',
  'ть',
  'ы',
  'и',
  'а',
  'я',
  'о',
  'е',
  'у',
  'ю',
  'ь',
  'й',
].sort((a, b) => b.length - a.length);

/** A crude stem: Cyrillic words lose a common ending (keeping 4+ letters) and are capped at 7. */
export function stem(word: string): string {
  if (!/[а-я]/.test(word)) return word;
  for (const end of ENDINGS) {
    if (word.endsWith(end) && word.length - end.length >= 4) {
      return word.slice(0, -end.length).slice(0, 7);
    }
  }
  return word.slice(0, 7);
}

/** Lower case, ё → е, words of 2+ letters, stop words dropped, stemmed. */
export function tokenize(text: string): string[] {
  return (
    text
      .toLowerCase()
      .replaceAll('ё', 'е')
      // «R:R» and «R/R» are one term, not two one-letter words.
      .replace(/(^|[^a-z])r\s*[:/]\s*r(?![a-z])/g, '$1 rr ')
      .split(/[^a-zа-я0-9]+/)
      .filter((w) => w.length >= 2 && !STOP_WORDS.has(w))
      .map(stem)
  );
}

export interface SearchHit {
  chunk: CourseChunk;
  score: number;
}

export interface CourseSearch {
  size: number;
  search(query: string, limit?: number): SearchHit[];
}

const K1 = 1.2;
const B = 0.75;
/** Title words count this many times: a heading says what the excerpt is about. */
const TITLE_WEIGHT = 3;

export function createCourseSearch(chunks: readonly CourseChunk[]): CourseSearch {
  const docs = chunks.map((chunk) => {
    const tf = new Map<string, number>();
    const add = (t: string, n: number) => tf.set(t, (tf.get(t) ?? 0) + n);
    for (const t of tokenize(chunk.title)) add(t, TITLE_WEIGHT);
    for (const t of tokenize(chunk.text)) add(t, 1);
    let length = 0;
    for (const n of tf.values()) length += n;
    return { chunk, tf, length };
  });
  const df = new Map<string, number>();
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const avg = docs.reduce((s, d) => s + d.length, 0) / Math.max(1, docs.length);
  const n = docs.length;

  return {
    size: n,
    search(query, limit = 4) {
      const terms = [...new Set(tokenize(query))];
      if (!terms.length) return [];
      const hits: SearchHit[] = [];
      for (const d of docs) {
        let score = 0;
        for (const t of terms) {
          const f = d.tf.get(t);
          if (!f) continue;
          const idf = Math.log(1 + (n - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));
          score += (idf * f * (K1 + 1)) / (f + K1 * (1 - B + (B * d.length) / avg));
        }
        if (score > 0) hits.push({ chunk: d.chunk, score });
      }
      return hits.sort((a, b) => b.score - a.score).slice(0, limit);
    },
  };
}

/** The index built by `npm run ai:index`; an empty search if the file is missing or broken. */
export function loadCourseSearch(
  file: URL = new URL('../../data/course-index.json', import.meta.url),
): { search: CourseSearch; error?: string } {
  try {
    const parsed = courseIndexFileSchema.parse(JSON.parse(readFileSync(file, 'utf8')));
    return { search: createCourseSearch(parsed.chunks) };
  } catch (error) {
    return {
      search: createCourseSearch([]),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
