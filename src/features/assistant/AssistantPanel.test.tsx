import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { PublicUser } from '@bulleak/shared';
import { createApiClient, type StoredSession } from '@/api/client';
import { useAuth } from '@/store/authStore';
import { AssistantLauncher } from './AssistantLauncher';
import { useAssistant } from './assistantStore';

const user: PublicUser = {
  id: '6f9b2a52-6f5a-4d8f-9b1e-2c7c1c0b3a11',
  email: 'trader@mail.test',
  name: 'Ника',
  emailVerified: true,
  createdAt: '2026-11-10T10:00:00.000Z',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const sse = (text: string) =>
  new Response(
    new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new TextEncoder().encode(text));
        c.close();
      },
    }),
    { headers: { 'Content-Type': 'text/event-stream' } },
  );

function setup(stream: () => Response, signedIn = true) {
  let session: StoredSession | null = signedIn ? { user, refreshToken: 'r1' } : null;
  const bodies: unknown[] = [];
  const api = createApiClient({
    baseUrl: 'https://api.test/v1',
    store: {
      read: () => session,
      write: (s) => {
        session = s;
      },
    },
    lock: (task) => task(),
    fetch: vi.fn((url: string | URL | Request, init?: RequestInit) => {
      const path = String(url).replace('https://api.test/v1', '');
      if (path === '/auth/refresh')
        return Promise.resolve(
          json(200, { user, accessToken: 'a1', expiresIn: 900, refreshToken: 'r2' }),
        );
      if (path === '/ai/status') return Promise.resolve(json(200, { enabled: true, remaining: 5 }));
      if (path === '/ai/chat/stream') {
        bodies.push(JSON.parse(String(init?.body)));
        return Promise.resolve(stream());
      }
      return Promise.reject(new Error(`unexpected ${path}`));
    }) as unknown as typeof fetch,
  });
  useAuth.setState({ api, user: signedIn ? user : null });
  return { bodies };
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AssistantLauncher />
    </MemoryRouter>,
  );

beforeEach(() => {
  useAssistant.setState({ open: false, messages: [], remaining: null, enabled: true, busy: false });
});

describe('AssistantPanel', () => {
  it('asks about the current lesson and shows the streamed answer with its sources', async () => {
    const { bodies } = setup(() =>
      sse(
        'event: delta\ndata: {"text":"**Стоп** ставят "}\n\nevent: delta\ndata: {"text":"за уровень."}\n\n' +
          'event: done\ndata: {"remaining":4,"sources":[{"kind":"term","ref":"stop-loss","title":"Термин: Стоп-лосс"}]}\n\n',
      ),
    );
    renderAt('/lesson/m03-l02');
    await userEvent.click(screen.getByRole('button', { name: 'Помощник по курсу' }));
    expect(await screen.findByText(/помощник это учтёт/)).toBeInTheDocument();
    expect(await screen.findByText(/Вопросов на сегодня: 5/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Вопрос помощнику'), 'Где ставить стоп?{Enter}');
    expect(await screen.findByText('Стоп ставят за уровень.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Стоп-лосс/ })).toHaveAttribute(
      'href',
      '/glossary/stop-loss',
    );
    expect(screen.getByText(/Вопросов на сегодня: 4/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Объясни проще' }));
    await waitFor(() => expect(bodies).toHaveLength(2));
    const followUp = bodies[1] as { messages: { content: string }[] };
    expect(followUp.messages).toHaveLength(3);
    expect(followUp.messages.at(-1)?.content).toContain('Объясни проще');
    const sent = bodies[0] as { messages: { content: string }[] };
    expect(sent.messages.at(-1)?.content).toMatch(
      /^\(Я сейчас в уроке «.+»\.\) Где ставить стоп\?$/,
    );
  });

  it('shows the server message when the questions ran out', async () => {
    setup(() =>
      json(429, {
        error: { code: 'ai_quota', message: 'На сегодня вопросы закончились (30 в день).' },
      }),
    );
    renderAt('/');
    await userEvent.click(screen.getByRole('button', { name: 'Помощник по курсу' }));
    await userEvent.click(await screen.findByRole('button', { name: /funding rate/ }));
    expect(
      await screen.findByText('На сегодня вопросы закончились (30 в день).'),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Вопрос помощнику')).toBeDisabled());
  });

  it('asks a guest to sign in', async () => {
    setup(() => json(500, {}), false);
    renderAt('/');
    await userEvent.click(screen.getByRole('button', { name: 'Помощник по курсу' }));
    expect(await screen.findByRole('link', { name: 'Войти' })).toHaveAttribute('href', '/login');
    expect(screen.queryByLabelText('Вопрос помощнику')).not.toBeInTheDocument();
  });
});

describe('assistant history (T-2306)', () => {
  it('is saved on this device and wiped on sign-out', async () => {
    setup(() =>
      sse(
        'event: delta\ndata: {"text":"Ответ."}\n\nevent: done\ndata: {"remaining":3,"sources":[]}\n\n',
      ),
    );
    await useAssistant.getState().ask('Вопрос');
    expect(useAssistant.getState().messages.map((m) => m.text)).toEqual(['Вопрос', 'Ответ.']);
    expect(localStorage.getItem('tc-assistant')).toContain('Ответ.');
    useAuth.setState({ user: null });
    expect(useAssistant.getState().messages).toEqual([]);
    expect(localStorage.getItem('tc-assistant')).not.toContain('Ответ.');
  });
});
