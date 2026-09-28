/**
 * Course certificate (exams-certificate.md): what the card shows and its "unique" code —
 * a hash of the name and the pass date, so the same learner gets the same code.
 */
import type { ProgressState } from '@/types/progress';
import { levelFromXp } from './gamification/levels';

export interface CertificateData {
  name: string;
  /** When the final exam was passed. */
  issuedAt: number;
  /** Best final exam score, 0–1. */
  score: number;
  level: number;
  rank: string;
  /** Time spent in lessons, hours rounded to 0.1. */
  hours: number;
  code: string;
}

/** FNV-1a, 32 bit. */
function fnv1a(text: string, seed = 0x811c9dc5): number {
  let h = seed;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const hex4 = (n: number) => (n & 0xffff).toString(16).toUpperCase().padStart(4, '0');

/** "TBN-XXXX-XXXX": stable for a name and a pass day (UTC), case- and space-insensitive name. */
export function certificateCode(name: string, issuedAt: number): string {
  const key = `${name.trim().toLowerCase()}|${new Date(issuedAt).toISOString().slice(0, 10)}`;
  const a = fnv1a(key);
  const b = fnv1a(key, a);
  return `TBN-${hex4(a)}-${hex4(b)}`;
}

/** Null until the final exam is passed. An empty name falls back to «Выпускник курса». */
export function certificateData(
  p: Pick<ProgressState, 'exams' | 'profile' | 'xp' | 'lessons'>,
): CertificateData | null {
  const final = p.exams.final;
  if (final?.passedAt === undefined) return null;
  const name = p.profile.name.trim() || 'Выпускник курса';
  const level = levelFromXp(p.xp);
  return {
    name,
    issuedAt: final.passedAt,
    score: final.best,
    level: level.level,
    rank: level.rank,
    hours:
      Math.round(
        (Object.values(p.lessons).reduce((sum, l) => sum + (l?.timeSpentSec ?? 0), 0) / 3600) * 10,
      ) / 10,
    code: certificateCode(name, final.passedAt),
  };
}
