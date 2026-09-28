import { describe, expect, it } from 'vitest';
import { createInitialProgress } from './progress/initial';
import { certificateCode, certificateData } from './certificate';

const DAY = Date.UTC(2026, 8, 29, 10);

describe('certificateCode', () => {
  it('is stable for the same name and day, different otherwise', () => {
    const code = certificateCode('Анна', DAY);
    expect(code).toMatch(/^TBN-[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(certificateCode('  анна ', DAY + 3_600_000)).toBe(code);
    expect(certificateCode('Анна', DAY + 86_400_000)).not.toBe(code);
    expect(certificateCode('Иван', DAY)).not.toBe(code);
  });
});

describe('certificateData', () => {
  it('is null until the final exam is passed', () => {
    const p = createInitialProgress(DAY);
    expect(certificateData(p)).toBeNull();
    expect(certificateData({ ...p, exams: { final: { best: 0.7, attempts: 1 } } })).toBeNull();
  });

  it('collects name, date, score, level and hours', () => {
    const p = createInitialProgress(DAY);
    const data = certificateData({
      ...p,
      xp: 0,
      profile: { ...p.profile, name: ' Анна ' },
      exams: { final: { best: 0.9, attempts: 2, passedAt: DAY } },
      lessons: {
        'm00-l01': {
          quizBest: 1,
          quizAttempts: 1,
          timeSpentSec: 5400,
          xpEarned: 0,
          improvements: 0,
        },
      },
    });
    expect(data).toMatchObject({ name: 'Анна', issuedAt: DAY, score: 0.9, level: 1, hours: 1.5 });
    expect(data?.code).toBe(certificateCode('Анна', DAY));
  });

  it('falls back to a generic name', () => {
    const p = createInitialProgress(DAY);
    const data = certificateData({
      ...p,
      exams: { final: { best: 1, attempts: 1, passedAt: DAY } },
    });
    expect(data?.name).toBe('Выпускник курса');
  });
});
