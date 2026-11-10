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
  emailVerified: true,
  createdAt: '2026-11-10T10:00:00.000Z',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function withApi(stored: StoredSession | null) {
  const paths: string[] = [];
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
    fetch: vi.fn((url: string | URL | Request) => {
      const path = String(url).replace('https://api.test/v1', '');
      paths.push(path);
      if (path === '/auth/refresh') {
        return Promise.resolve(
          json(200, { user, accessToken: 'a1', expiresIn: 900, refreshToken: 'r2' }),
        );
      }
      if (path === '/me') return Promise.resolve(json(200, { user }));
      return Promise.resolve(new Response(null, { status: 204 }));
    }) as unknown as typeof fetch,
  });
  useAuth.setState({ api, user: stored?.user ?? null });
  return paths;
}

const renderSettings = () =>
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/settings'] })} />);

beforeEach(() => {
  localStorage.clear();
  useProgress.getState().reset();
  useUi.setState({ toasts: [], rewardsQueue: [] });
  useAuth.setState({ api: null, user: null });
});

const accountCard = async () =>
  (await screen.findByRole('heading', { level: 2, name: 'Аккаунт' })).parentElement as HTMLElement;

describe('Settings → Аккаунт', () => {
  it('is hidden in a guest-only build', async () => {
    renderSettings();
    expect(await screen.findByRole('heading', { level: 1, name: 'Настройки' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Аккаунт' })).not.toBeInTheDocument();
  });

  it('offers sign-in to a guest', async () => {
    withApi(null);
    renderSettings();
    const card = await accountCard();
    expect(within(card).getByRole('link', { name: 'Войти' })).toHaveAttribute('href', '/login');
    expect(within(card).getByRole('link', { name: 'Создать аккаунт' })).toHaveAttribute(
      'href',
      '/register',
    );
  });

  it('shows the account and signs out', async () => {
    const paths = withApi({ user, refreshToken: 'r1' });
    const ue = userEvent.setup();
    renderSettings();
    const card = await accountCard();
    expect(within(card).getByText('trader@mail.test')).toBeInTheDocument();
    expect(within(card).getByText('Подтверждён')).toBeInTheDocument();
    await ue.click(within(card).getByRole('button', { name: 'Выйти' }));
    expect(useAuth.getState().user).toBeNull();
    expect(paths).toContain('/auth/logout');
  });

  it('signs out everywhere after confirmation', async () => {
    const paths = withApi({ user, refreshToken: 'r1' });
    const ue = userEvent.setup();
    renderSettings();
    const card = await accountCard();
    await ue.click(within(card).getByRole('button', { name: 'Выйти на всех устройствах' }));
    const dialog = screen.getByRole('dialog', { name: 'Выйти на всех устройствах?' });
    await ue.click(within(dialog).getByRole('button', { name: 'Выйти везде' }));
    expect(await screen.findByText('Ты вышел на всех устройствах')).toBeInTheDocument();
    expect(paths).toContain('/auth/logout-all');
    expect(useAuth.getState().user).toBeNull();
  });
});
