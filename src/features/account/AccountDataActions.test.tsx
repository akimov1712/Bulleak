import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PublicUser } from '@bulleak/shared';
import { createApiClient, type StoredSession } from '@/api/client';
import { useAuth } from '@/store/authStore';
import { useUi } from '@/store/uiStore';
import { AccountDataActions } from './AccountDataActions';

const download = vi.hoisted(() => vi.fn());
vi.mock('@/features/io/download', () => ({ downloadFile: download }));

const user: PublicUser = {
  id: '6f9b2a52-6f5a-4d8f-9b1e-2c7c1c0b3a11',
  email: 'trader@mail.test',
  name: 'Ника',
  emailVerified: true,
  createdAt: '2026-11-10T10:00:00.000Z',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const exported = {
  format: 'bulleak-account-export',
  exportedAt: '2026-11-12T10:00:00.000Z',
  user,
  progress: { xp: 10 },
  settings: null,
  records: { sim: [], journal: [{ note: 'n' }] },
};

function setup(passwordOk: (password: string) => boolean) {
  let session: StoredSession | null = { user, refreshToken: 'r1' };
  const deletes: unknown[] = [];
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
      if (path === '/auth/refresh') {
        return Promise.resolve(
          json(200, { user, accessToken: 'a1', expiresIn: 900, refreshToken: 'r2' }),
        );
      }
      if (path === '/me/export') return Promise.resolve(json(200, exported));
      if (path === '/me' && init?.method === 'DELETE') {
        const body = JSON.parse(String(init.body)) as { password: string };
        deletes.push(body);
        if (!passwordOk(body.password)) {
          return Promise.resolve(
            json(403, {
              error: {
                code: 'wrong_password',
                message: 'Неверный пароль',
                fields: { password: 'Неверный пароль' },
              },
            }),
          );
        }
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    }) as unknown as typeof fetch,
  });
  useAuth.setState({ api, user });
  render(<AccountDataActions api={api} />);
  return { deletes, session: () => session };
}

beforeEach(() => {
  download.mockReset();
  useUi.setState({ toasts: [], rewardsQueue: [] });
});

describe('AccountDataActions', () => {
  it('downloads the server copy of the data as JSON', async () => {
    setup(() => true);
    await userEvent.click(screen.getByRole('button', { name: 'Скачать мои данные' }));
    await vi.waitFor(() => expect(download).toHaveBeenCalledTimes(1));
    const [name, blob] = download.mock.calls[0] as [string, Blob];
    expect(name).toMatch(/^bulleak-account-\d{4}-\d{2}-\d{2}\.json$/);
    expect(JSON.parse(await blob.text())).toEqual(exported);
  });

  it('deletes only after the password and the confirmation word', async () => {
    const { deletes, session } = setup((p) => p === 'right-pass');
    await userEvent.click(screen.getByRole('button', { name: 'Удалить аккаунт' }));
    const confirm = await screen.findByRole('button', { name: 'Удалить навсегда' });
    expect(confirm).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Пароль'), 'wrong-pass');
    await userEvent.type(screen.getByLabelText(/Напиши УДАЛИТЬ/), 'удалить');
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    expect(await screen.findByRole('alert')).toHaveTextContent('Неверный пароль');
    expect(useAuth.getState().user).toEqual(user);

    await userEvent.clear(screen.getByLabelText('Пароль'));
    await userEvent.type(screen.getByLabelText('Пароль'), 'right-pass');
    await userEvent.click(confirm);
    await vi.waitFor(() => expect(useAuth.getState().user).toBeNull());
    expect(session()).toBeNull();
    expect(deletes).toEqual([
      { password: 'wrong-pass', confirm: 'удалить' },
      { password: 'right-pass', confirm: 'удалить' },
    ]);
  });
});
