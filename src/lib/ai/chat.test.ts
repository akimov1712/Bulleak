import { describe, expect, it } from 'vitest';
import { AI_HISTORY_MAX } from '@bulleak/shared';
import {
  CHAT_KEPT,
  chatRequest,
  lessonIdFromPathname,
  plainAnswer,
  sanitizeHistory,
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

describe('sanitizeHistory', () => {
  it('keeps valid messages, closes cut-off answers and drops junk', () => {
    expect(
      sanitizeHistory([
        { id: 'a', role: 'user', text: 'Вопрос', status: 'done' },
        {
          id: 'b',
          role: 'assistant',
          text: 'Отв',
          status: 'streaming',
          sources: [{ kind: 'term', ref: 'sl', title: 'Стоп' }, { kind: 'x' }],
        },
        { id: 'c', role: 'assistant', text: '', status: 'streaming' },
        { id: 'd', role: 'system', text: 'x', status: 'done' },
        null,
        'junk',
      ]),
    ).toEqual([
      { id: 'a', role: 'user', text: 'Вопрос', status: 'done' },
      {
        id: 'b',
        role: 'assistant',
        text: 'Отв …',
        status: 'done',
        sources: [{ kind: 'term', ref: 'sl', title: 'Стоп' }],
      },
    ]);
    expect(sanitizeHistory({})).toEqual([]);
  });

  it('keeps only the latest messages', () => {
    const many = Array.from({ length: CHAT_KEPT + 5 }, (_, i) => ({
      id: String(i),
      role: 'user',
      text: 't',
      status: 'done',
    }));
    const kept = sanitizeHistory(many);
    expect(kept).toHaveLength(CHAT_KEPT);
    expect(kept[0]?.id).toBe('5');
  });
});
