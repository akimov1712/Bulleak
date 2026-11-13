import { describe, expect, it } from 'vitest';
import { AI_HISTORY_MAX } from '@bulleak/shared';
import {
  chatRequest,
  lessonIdFromPathname,
  plainAnswer,
  suggestions,
  type ChatMessage,
} from './chat';

const msg = (
  id: number,
  role: ChatMessage['role'],
  text: string,
  status: ChatMessage['status'] = 'done',
): ChatMessage => ({ id: String(id), role, text, status });

describe('chatRequest', () => {
  it('sends finished turns, starting with a question, and names the lesson', () => {
    const body = chatRequest(
      [
        msg(1, 'user', 'Что такое стоп?'),
        msg(2, 'assistant', 'Выход по цене.'),
        msg(3, 'user', 'А зачем?'),
        msg(4, 'assistant', '', 'error'),
        msg(5, 'user', '  Почему за уровнем?  '),
      ],
      { lessonTitle: 'Стоп-лосс' },
    );
    expect(body.messages).toEqual([
      { role: 'user', content: 'Что такое стоп?' },
      { role: 'assistant', content: 'Выход по цене.' },
      { role: 'user', content: 'А зачем?' },
      { role: 'user', content: '(Я сейчас в уроке «Стоп-лосс».) Почему за уровнем?' },
    ]);
  });

  it('keeps the last turns within the API limit', () => {
    const long = Array.from({ length: 15 }, (_, i) =>
      msg(i, i % 2 ? 'assistant' : 'user', `m${i}`),
    );
    const body = chatRequest(long);
    expect(body.messages.length).toBeLessThanOrEqual(AI_HISTORY_MAX);
    expect(body.messages[0]?.role).toBe('user');
    expect(body.messages.at(-1)).toEqual({ role: 'user', content: 'm14' });
  });
});

describe('helpers', () => {
  it('reads the lesson from the path', () => {
    expect(lessonIdFromPathname('/lesson/m03-l02')).toBe('m03-l02');
    expect(lessonIdFromPathname('/lesson/m03-l02/quiz')).toBe('m03-l02');
    expect(lessonIdFromPathname('/module/m03')).toBeNull();
  });

  it('turns markdown into plain chat text', () => {
    expect(plainAnswer('## Итог\n\n**Стоп** — это `SL`.\n\n\n- раз\n* два')).toBe(
      'Итог\n\nСтоп — это SL.\n\n• раз\n• два',
    );
  });

  it('suggests questions about the lesson when there is one', () => {
    expect(suggestions({ lessonTitle: 'RSI' })[0]).toContain('урока');
    expect(suggestions()).toHaveLength(3);
  });
});
