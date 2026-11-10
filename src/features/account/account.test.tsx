import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type { PublicUser } from '@bulleak/shared';
import { createApiClient, type StoredSession } from '@/api/client';
import { routes } from '@/app/routes';
import { useAuth } from '@/store/authStore';
import { useProgress } from '@/store/progressStore';
import { useUi } from '@/store/uiStore';

const user: PublicUser = {
  id: '6f9b2a52-6f5a-4d8f-9b1e-2c7c1c0b3a11',
  email: 'trader@mail.test',
  name: 'Ника',
  emailVerified: false,
  createdAt: '2026-11-10T10:00:00.000Z',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const ok = () => json(200, { user, accessToken: 'a1', expiresIn: 900, refreshToken: 'r1' });
const apiError = (status: number, code: string, message: string, fields?: object) =>
  json(status, { error: { code, message, ...(fields ? { fields } : {}) } });

/** Puts a client with a scripted fake API into the store; returns the recorded requests. */
function withApi(answer: (path: string, body: Record<string, unknown>) => Response) {
  const requests: { path: string; body: Record<string, unknown> }[] = [];
  let stored: StoredSession | null = null;
  const api = createApiClient({
    baseUrl: 'https://api.test/v1',
    store: {
      read: () => stored,
      write: (s) => {
        stored = s;
      },
    },
    lock: (task) => task(),
    fetch: vi.fn((url: string | URL | Request, init?: RequestInit) => {
      const path = String(url).replace('https://api.test/v1', '');
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
      requests.push({ path, body });
      return Promise.resolve(answer(path, body));
    }) as unknown as typeof fetch,
  });
  useAuth.setState({ api, user: null });
  return requests;
}

const renderAt = (path: string) =>
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />);

beforeEach(() => {
  localStorage.clear();
  useProgress.getState().reset();
  useUi.setState({ toasts: [], rewardsQueue: [] });
  useAuth.setState({ api: null, user: null });
});

describe('LoginPage', () => {
  it('signs in and goes to the requested page', async () => {
    const requests = withApi(() => ok());
    const ue = userEvent.setup();
    renderAt('/login?next=/glossary');
    await ue.type(await screen.findByLabelText('E-mail'), ' Trader@Mail.Test ');
    await ue.type(screen.getByLabelText('Пароль'), 'secret-pass-1');
    await ue.click(screen.getByRole('button', { name: 'Войти' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Глоссарий' })).toBeInTheDocument();
    expect(requests[0]).toEqual({
      path: '/auth/login',
      body: { email: 'trader@mail.test', password: 'secret-pass-1' },
    });
    expect(useAuth.getState().user).toEqual(user);
  });

  it('checks fields before sending', async () => {
    const requests = withApi(() => ok());
    const ue = userEvent.setup();
    renderAt('/login');
    await ue.type(await screen.findByLabelText('E-mail'), 'not-an-email');
    await ue.click(screen.getByRole('button', { name: 'Войти' }));
    expect(screen.getByText('Проверь e-mail — похоже, в нём ошибка')).toBeInTheDocument();
    expect(screen.getByText('Укажи пароль')).toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });

  it.each([
    [401, 'invalid_credentials', 'Неверный e-mail или пароль'],
    [429, 'rate_limited', 'Слишком много попыток. Попробуй через 15 мин.'],
  ])('shows the %s answer', async (status, code, message) => {
    withApi(() => apiError(status, code, message));
    const ue = userEvent.setup();
    renderAt('/login');
    await ue.type(await screen.findByLabelText('E-mail'), 'trader@mail.test');
    await ue.type(screen.getByLabelText('Пароль'), 'wrong-pass');
    await ue.click(screen.getByRole('button', { name: 'Войти' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(useAuth.getState().user).toBeNull();
  });

  it('says accounts are off without an API', async () => {
    renderAt('/login');
    expect(
      await screen.findByText(/Аккаунты на этой версии сайта пока недоступны/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Войти' })).not.toBeInTheDocument();
  });
});

describe('RegisterPage', () => {
  it('creates an account with the onboarding name filled in', async () => {
    useProgress.getState().setName('Ника');
    const requests = withApi(() => ok());
    const ue = userEvent.setup();
    renderAt('/register');
    expect(await screen.findByLabelText('Как тебя зовут?')).toHaveValue('Ника');
    await ue.type(screen.getByLabelText('E-mail'), 'trader@mail.test');
    await ue.type(screen.getByLabelText('Пароль'), 'correct horse battery');
    await ue.click(screen.getByRole('button', { name: 'Создать аккаунт' }));
    expect(await screen.findByText(/Мы отправили письмо для подтверждения/)).toBeInTheDocument();
    expect(requests[0]?.body).toEqual({
      name: 'Ника',
      email: 'trader@mail.test',
      password: 'correct horse battery',
    });
  });

  it('refuses a weak password without a request', async () => {
    const requests = withApi(() => ok());
    const ue = userEvent.setup();
    renderAt('/register');
    await ue.type(await screen.findByLabelText('Как тебя зовут?'), 'Ника');
    await ue.type(screen.getByLabelText('E-mail'), 'trader@mail.test');
    await ue.type(screen.getByLabelText('Пароль'), 'qwerty2024');
    await ue.click(screen.getByRole('button', { name: 'Создать аккаунт' }));
    expect(screen.getByText(/слишком легко подобрать/)).toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });

  it('shows a taken e-mail under the field', async () => {
    withApi(() =>
      apiError(409, 'email_taken', 'Аккаунт с таким e-mail уже есть', {
        email: 'Аккаунт с таким e-mail уже есть',
      }),
    );
    const ue = userEvent.setup();
    renderAt('/register');
    await ue.type(await screen.findByLabelText('Как тебя зовут?'), 'Ника');
    await ue.type(screen.getByLabelText('E-mail'), 'trader@mail.test');
    await ue.type(screen.getByLabelText('Пароль'), 'correct horse battery');
    await ue.click(screen.getByRole('button', { name: 'Создать аккаунт' }));
    expect(await screen.findByText('Аккаунт с таким e-mail уже есть')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('profile menu', () => {
  it('offers sign-in to a guest and sign-out to an account', async () => {
    const requests = withApi(() => new Response(null, { status: 204 }));
    const ue = userEvent.setup();
    renderAt('/');
    await ue.click(await screen.findByRole('button', { name: /^Профиль:/ }));
    expect(screen.getByRole('link', { name: 'Войти' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Регистрация' })).toHaveAttribute('href', '/register');
    await ue.keyboard('{Escape}');

    useAuth.setState({ user });
    await ue.click(screen.getByRole('button', { name: /^Профиль:/ }));
    expect(screen.getByText('trader@mail.test')).toBeInTheDocument();
    await ue.click(screen.getByRole('button', { name: 'Выйти' }));
    expect(useAuth.getState().user).toBeNull();
    expect(requests.map((r) => r.path)).toContain('/auth/logout');
  });

  it('has no account items without an API', async () => {
    const ue = userEvent.setup();
    renderAt('/');
    await ue.click(await screen.findByRole('button', { name: /^Профиль:/ }));
    const menu = screen.getByRole('list', { name: 'Профиль' }).parentElement?.parentElement;
    expect(within(menu ?? document.body).queryByRole('link', { name: 'Войти' })).toBeNull();
  });
});
