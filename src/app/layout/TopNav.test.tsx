import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { TopNav } from './TopNav';
import { BottomNav } from './BottomNav';
import { sectionOf } from './nav';
import { useProgress } from '@/store/progressStore';
import { DEFAULT_SETTINGS, useSettings } from '@/store/settingsStore';
import { useUi } from '@/store/uiStore';

beforeEach(() => {
  localStorage.clear();
  useProgress.getState().reset();
  useSettings.setState(DEFAULT_SETTINGS);
  useUi.setState({ searchOpen: false });
});

const renderAt = (path: string, ui = <TopNav />) =>
  render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);

describe('sectionOf', () => {
  it('maps pages, including ones not in the menus, to their section', () => {
    expect(sectionOf('/')).toBe('learn');
    expect(sectionOf('/lesson/m01-l02')).toBe('learn');
    expect(sectionOf('/journal/12')).toBe('practice');
    expect(sectionOf('/glossary/leverage')).toBe('reference');
    expect(sectionOf('/certificate')).toBe('progress');
    expect(sectionOf('/settings')).toBeNull();
    // A prefix only matches whole path segments.
    expect(sectionOf('/pathfinder')).toBeNull();
  });
});

describe('TopNav', () => {
  it('shows the brand, sections and marks the current one', () => {
    renderAt('/glossary');
    expect(screen.getByRole('link', { name: 'Bulleak — на главную' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Основная навигация' });
    const buttons = within(nav).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual([
      'Обучение',
      'Практика',
      'Справочник',
      'Прогресс',
    ]);
    expect(within(nav).getByRole('button', { name: 'Справочник' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('opens a section menu with its pages', async () => {
    const user = userEvent.setup();
    renderAt('/glossary');
    const nav = screen.getByRole('navigation', { name: 'Основная навигация' });
    const practice = within(nav).getByRole('button', { name: 'Практика' });
    expect(practice).toHaveAttribute('aria-expanded', 'false');
    await user.click(practice);
    expect(practice).toHaveAttribute('aria-expanded', 'true');
    const menu = within(nav).getByRole('list', { name: 'Практика' });
    expect(
      within(menu)
        .getAllByRole('link')
        .map((a) => a.textContent),
    ).toEqual([
      expect.stringContaining('Тренажёр'),
      expect.stringContaining('Журнал'),
      expect.stringContaining('Инструменты'),
      expect.stringContaining('Торговый план'),
    ]);
    await user.keyboard('{Escape}');
    expect(practice).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows streak and XP, and the profile menu holds level, settings and theme', async () => {
    const user = userEvent.setup();
    renderAt('/');
    const progress = screen.getByRole('group', { name: 'Твой прогресс' });
    expect(
      within(progress).getByRole('button', { name: 'Серия: 0 дней подряд' }),
    ).toBeInTheDocument();
    expect(within(progress).getByRole('button', { name: 'Опыт: 0 XP' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Профиль: уровень 1, Новичок' }));
    expect(screen.getByRole('link', { name: 'Настройки' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Включить светлую тему' }));
    expect(useSettings.getState().theme).toBe('light');
  });

  it('opens the search with Ctrl+K and from the search button', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.keyboard('{Control>}k{/Control}');
    expect(useUi.getState().searchOpen).toBe(true);
    useUi.setState({ searchOpen: false });
    const [searchButton] = screen.getAllByRole('button', { name: 'Поиск по курсу' });
    if (searchButton) await user.click(searchButton);
    expect(useUi.getState().searchOpen).toBe(true);
  });
});

describe('BottomNav', () => {
  it('has four pages and a sheet with every section', async () => {
    const user = userEvent.setup();
    renderAt('/stats', <BottomNav />);
    const nav = screen.getByRole('navigation', { name: 'Основная навигация' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((a) => a.textContent),
    ).toEqual(['Главная', 'Курс', 'Тренажёр', 'Журнал']);
    await user.click(within(nav).getByRole('button', { name: 'Ещё' }));
    const sheet = screen.getByRole('dialog', { name: 'Разделы' });
    for (const name of ['Обучение', 'Практика', 'Справочник', 'Прогресс']) {
      expect(within(sheet).getByRole('region', { name })).toBeInTheDocument();
    }
    expect(within(sheet).getByRole('link', { name: 'Статистика' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('does not mark «Ещё» on lesson pages', () => {
    renderAt('/lesson/m01-l02', <BottomNav />);
    expect(screen.getByRole('button', { name: 'Ещё' }).querySelector('span')).toHaveClass(
      'opacity-0',
    );
  });
});
