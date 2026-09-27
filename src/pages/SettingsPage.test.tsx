import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/db';
import { journalRepo } from '@/db/journalRepo';
import { buildExport } from '@/lib/io/backup';
import { createInitialProgress } from '@/lib/progress/initial';
import { useProgress } from '@/store/progressStore';
import { DEFAULT_SETTINGS, useSettings } from '@/store/settingsStore';
import { SettingsPage } from './SettingsPage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  );

const upload = (text: string) =>
  fireEvent.change(screen.getByLabelText('Восстановить из файла'), {
    target: { files: [new File([text], 'backup.json', { type: 'application/json' })] },
  });

beforeEach(async () => {
  localStorage.clear();
  useProgress.setState(createInitialProgress(Date.now()));
  useSettings.setState(DEFAULT_SETTINGS);
  await db.simTrades.clear();
  await db.journal.clear();
});

describe('SettingsPage', () => {
  it('changes settings and the profile name', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('radio', { name: 'Тёмная' }));
    expect(useSettings.getState().theme).toBe('dark');
    await userEvent.click(screen.getByRole('radio', { name: '100 XP' }));
    expect(useSettings.getState().dailyGoalXp).toBe(100);
    fireEvent.change(screen.getByLabelText('Имя'), { target: { value: 'Артём' } });
    expect(useProgress.getState().profile.name).toBe('Артём');
  });

  it('a broken file shows an error and changes nothing', async () => {
    useProgress.setState({ xp: 77 });
    renderPage();
    upload('{"app":"something-else"}');
    expect(await screen.findByText(/Это не резервная копия этого курса/)).toBeInTheDocument();
    expect(useProgress.getState().xp).toBe(77);
  });

  it('a valid file shows a preview and replaces the data after confirmation', async () => {
    const progress = { ...createInitialProgress(Date.now()), xp: 900 };
    const file = buildExport({
      progress,
      settings: { ...DEFAULT_SETTINGS, theme: 'dark' },
      simTrades: [],
      journal: [
        {
          openedAt: 1,
          account: 'demo',
          symbol: 'BTCUSDT',
          side: 'long',
          market: 'perp',
          entry: 100,
          sl: 90,
          qty: 1,
          leverage: 1,
          fees: 0,
          setup: 'x',
          timeframe: '4H',
          followedPlan: true,
          emotion: 'calm',
          notes: '',
          tags: [],
        },
      ],
      now: Date.now(),
    });
    renderPage();
    upload(JSON.stringify(file));
    const dialog = await screen.findByRole('dialog', { name: 'Восстановить из копии?' });
    expect(dialog).toHaveTextContent('опыт 900 XP');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Заменить данные' }));
    await waitFor(() => expect(useProgress.getState().xp).toBe(900));
    expect(useSettings.getState().theme).toBe('dark');
    expect(await journalRepo.count()).toBe(1);
  });

  it('reset needs the confirmation word', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Сбросить весь прогресс' }));
    const dialog = await screen.findByRole('dialog', { name: 'Сбросить весь прогресс?' });
    const confirm = within(dialog).getByRole('button', { name: 'Сбросить' });
    expect(confirm).toBeDisabled();
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'сброс' } });
    expect(confirm).toBeEnabled();
  });
});
