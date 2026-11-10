import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
const noContent = () => new Response(null, { status: 204 });
const linkInvalid = () =>
  json(400, {
    error: {
      code: 'token_invalid',
      message: 'Ссылка недействительна или устарела. Запроси новую.',
    },
  });

function withApi(
  answer: (path: string, body: Record<string, unknown>) => Response,
  stored: StoredSession | null = null,
) {
  const requests: { path: string; body: Record<string, unknown> }[] = [];
  let session = stored;
  const api = createApiClient({
    baseUrl: 'https://api.test/v1',
    store: {
      read: () => session,
      write: (s) => {
        session = s;
      },
    },
    lock: (task) => task(),
    onSignedOut: () => useAuth.setState({ user: null }),
    fetch: vi.fn((url: string | URL | Request, init?: RequestInit) => {
      const path = String(url).replace('https://api.test/v1', '');
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
      requests.push({ path, body });
      return Promise.resolve(answer(path, body));
    }) as unknown as typeof fetch,
  });
  useAuth.setState({ api, user: stored?.user ?? null });
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

describe('ForgotPage', () => {
  it('sends the link and answers the same way for any address', async () => {
    const requests = withApi(() => json(200, { ok: true }));
    const ue = userEvent.setup();
    renderAt('/forgot');
    await ue.type(await screen.findByLabelText('E-mail'), 'ghost@mail.test');
    await ue.click(screen.getByRole('button', { name: 'Отправить ссылку' }));
    expect(await screen.findByText(/Если аккаунт с адресом/)).toHaveTextContent('ghost@mail.test');
    expect(requests).toEqual([{ path: '/auth/forgot', body: { email: 'ghost@mail.test' } }]);
  });

  it('is linked from the login page', async () => {
    withApi(() => noContent());
    renderAt('/login');
    expect(await screen.findByRole('link', { name: 'Забыли пароль?' })).toHaveAttribute(
      'href',
      '/forgot',
    );
  });
});

describe('ResetPage', () => {
  /** Sessions live until the reset; afterwards the server rejects their refresh tokens. */
  function resettingApi(sameAccount: boolean) {
    let reset = false;
    return withApi(
      (path) => {
        if (path === '/auth/reset') {
          reset = true;
          return noContent();
        }
        if (path === '/auth/refresh') {
          return reset && sameAccount
            ? json(401, { error: { code: 'token_invalid', message: 'Сессия истекла.' } })
            : json(200, { user, accessToken: 'a1', expiresIn: 900, refreshToken: 'r2' });
        }
        if (path === '/me') return json(200, { user });
        return noContent();
      },
      { user, refreshToken: 'r1' },
    );
  }

  it('keeps another account signed in on this device', async () => {
    resettingApi(false);
    const ue = userEvent.setup();
    renderAt('/reset?token=tok-1');
    await ue.type(await screen.findByLabelText('Новый пароль'), 'brand new long phrase');
    await ue.click(screen.getByRole('button', { name: 'Сохранить пароль' }));
    expect(await screen.findByText(/Пароль изменён/)).toBeInTheDocument();
    expect(useAuth.getState().user).toEqual(user);
  });

  it('sets a new password and signs this device out', async () => {
    const requests = resettingApi(true);
    const ue = userEvent.setup();
    renderAt('/reset?token=tok-1');
    await ue.type(await screen.findByLabelText('Новый пароль'), 'brand new long phrase');
    await ue.click(screen.getByRole('button', { name: 'Сохранить пароль' }));
    expect(await screen.findByText(/Пароль изменён/)).toBeInTheDocument();
    expect(requests.find((r) => r.path === '/auth/reset')).toEqual({
      path: '/auth/reset',
      body: { token: 'tok-1', password: 'brand new long phrase' },
    });
    expect(useAuth.getState().user).toBeNull();
  });

  it('offers a new link when the link has expired', async () => {
    withApi(() => linkInvalid());
    const ue = userEvent.setup();
    renderAt('/reset?token=old');
    await ue.type(await screen.findByLabelText('Новый пароль'), 'brand new long phrase');
    await ue.click(screen.getByRole('button', { name: 'Сохранить пароль' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ссылка недействительна');
    expect(screen.getByRole('link', { name: 'Запросить новую ссылку' })).toHaveAttribute(
      'href',
      '/forgot',
    );
  });

  it('refuses a weak password before sending and handles a link without a token', async () => {
    const requests = withApi(() => noContent());
    const ue = userEvent.setup();
    const { unmount } = renderAt('/reset?token=tok-1');
    await ue.type(await screen.findByLabelText('Новый пароль'), 'qwerty2024');
    await ue.click(screen.getByRole('button', { name: 'Сохранить пароль' }));
    expect(screen.getByText(/слишком легко подобрать/)).toBeInTheDocument();
    expect(requests).toHaveLength(0);
    unmount();
    renderAt('/reset');
    expect(await screen.findByText(/Ссылка неполная или устарела/)).toBeInTheDocument();
  });
});

describe('VerifyPage', () => {
  it('confirms the address once and refreshes the user', async () => {
    const requests = withApi(
      (path) =>
        path === '/me'
          ? json(200, { user: { ...user, emailVerified: true } })
          : path === '/auth/refresh'
            ? json(200, { user, accessToken: 'a1', expiresIn: 900, refreshToken: 'r2' })
            : noContent(),
      { user, refreshToken: 'r1' },
    );
    renderAt('/verify?token=v-1');
    expect(await screen.findByText('E-mail подтверждён. Спасибо!')).toBeInTheDocument();
    expect(requests.filter((r) => r.path === '/auth/verify-email')).toEqual([
      { path: '/auth/verify-email', body: { token: 'v-1' } },
    ]);
    await vi.waitFor(() => expect(useAuth.getState().user?.emailVerified).toBe(true));
  });

  it('explains a used link', async () => {
    withApi(() => linkInvalid());
    renderAt('/verify?token=used');
    expect(await screen.findByRole('alert')).toHaveTextContent('Ссылка недействительна');
  });
});

describe('verification reminder', () => {
  it('lets an unverified user resend the letter from the profile menu', async () => {
    const requests = withApi(
      (path) =>
        path === '/auth/refresh'
          ? json(200, { user, accessToken: 'a1', expiresIn: 900, refreshToken: 'r2' })
          : noContent(),
      { user, refreshToken: 'r1' },
    );
    const ue = userEvent.setup();
    renderAt('/');
    await ue.click(await screen.findByRole('button', { name: /^Профиль:/ }));
    expect(screen.getByText('E-mail не подтверждён')).toBeInTheDocument();
    await ue.click(screen.getByRole('button', { name: 'Отправить письмо ещё раз' }));
    expect(await screen.findByText('Письмо отправлено')).toBeInTheDocument();
    expect(requests.map((r) => r.path)).toContain('/auth/resend-verification');
  });
});
