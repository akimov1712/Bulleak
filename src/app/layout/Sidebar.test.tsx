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

  it('leads to the next lesson with course progress, except on home', () => {
    const { unmount } = renderAt('/glossary');
    const next = screen.getByRole('link', { name: /Продолжить · модуль 0/ });
    expect(next).toHaveAttribute('href', '/lesson/m00-l01');
    expect(next).toHaveTextContent(/0\/\d+/);
    unmount();
    renderAt('/');
    expect(screen.queryByRole('link', { name: /Продолжить/ })).not.toBeInTheDocument();
  });
});
