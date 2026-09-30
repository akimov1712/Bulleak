import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Sidebar } from './Sidebar';
import { useProgress } from '@/store/progressStore';
import { DEFAULT_SETTINGS, useSettings } from '@/store/settingsStore';

beforeEach(() => {
  localStorage.clear();
  useProgress.getState().reset();
  useSettings.setState(DEFAULT_SETTINGS);
});

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar />
    </MemoryRouter>,
  );

describe('Sidebar', () => {
  it('shows the brand and groups sections', () => {
    renderAt('/glossary');
    expect(screen.getByRole('link', { name: 'Bulleak — на главную' })).toBeInTheDocument();
    const practice = screen.getByRole('group', { name: 'Практика' });
    expect(within(practice).getByRole('link', { name: 'Тренажёр' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Глоссарий' })).toHaveAttribute('aria-current', 'page');
  });

  it('shows learner progress and the theme switch instead of a header', () => {
    renderAt('/glossary');
    const progress = screen.getByRole('region', { name: 'Твой прогресс' });
    expect(
      within(progress).getByRole('button', { name: 'Уровень 1, Новичок' }),
    ).toBeInTheDocument();
    expect(
      within(progress).getByRole('button', { name: 'Серия: 0 дней подряд' }),
    ).toBeInTheDocument();
    expect(within(progress).getByRole('button', { name: 'Опыт: 0 XP' })).toBeInTheDocument();
    expect(
      within(progress).getByRole('button', { name: /Включить (тёмную|светлую) тему/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Продолжить/ })).not.toBeInTheDocument();
  });
});
