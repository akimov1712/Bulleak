import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { TopNav } from './TopNav';
import { BottomNav } from './BottomNav';
import { isItemActive, NAV_SECTIONS } from './nav';
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

describe('isItemActive', () => {
  const byLabel = (label: string) => {
    const item = NAV_SECTIONS.flatMap((s) => s.items).find((i) => i.label === label);
    if (!item) throw new Error(label);
    return item;
  };

  it('matches the page, its sub-pages and extra prefixes, by whole segments', () => {
    expect(isItemActive(byLabel('Главная'), '/')).toBe(true);
    expect(isItemActive(byLabel('Главная'), '/path')).toBe(false);
    expect(isItemActive(byLabel('Карта курса'), '/lesson/m01-l02')).toBe(true);
    expect(isItemActive(byLabel('Карта курса'), '/exam/m01')).toBe(true);
    expect(isItemActive(byLabel('Журнал'), '/journal/12')).toBe(true);
    expect(isItemActive(byLabel('Карта курса'), '/pathfinder')).toBe(false);
  });
});

describe('TopNav', () => {
  it('shows every section as a tab, one click away, and marks the current one', () => {
    renderAt('/lesson/m01-l02');
    expect(screen.getByRole('link', { name: 'Bulleak — на главную' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Основная навигация' });
    expect(within(nav).queryAllByRole('button')).toHaveLength(0);
    expect(
      within(nav)
        .getAllByRole('link')
        .map((a) => a.getAttribute('aria-label') ?? a.textContent),
    ).toEqual([
      'Главная',
      'Карта курса',
      'Тренажёр',
      'Журнал',
      'Инструменты',
      'Торговый план',
      'Глоссарий',
      'Шпаргалки',
      'Статистика',
      'Достижения',
    ]);
    expect(within(nav).getByRole('link', { name: 'Карта курса' })).toHaveAttribute(
      'aria-current',
      'page',
    );
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
    expect(screen.getByRole('link', { name: 'Сертификат' })).toHaveAttribute(
      'href',
      '/certificate',
    );
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
