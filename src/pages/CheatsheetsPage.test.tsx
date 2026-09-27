import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { PRE_TRADE_CHECKLIST } from '@/content/cheatsheets';
import { createInitialProgress } from '@/lib/progress/initial';
import { useProgress } from '@/store/progressStore';
import { useSettings } from '@/store/settingsStore';
import { CheatsheetsPage } from './CheatsheetsPage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <CheatsheetsPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  useProgress.setState(createInitialProgress(Date.now()));
  useSettings.setState({ freeMode: false });
});

describe('CheatsheetsPage', () => {
  it('locks sheets until their module is finished; the checklist is always there', () => {
    renderPage();
    expect(screen.getByText(/Откроется, когда пройдёшь модуль «Bybit с нуля»/)).toBeInTheDocument();
    expect(screen.queryByText(/Post-Only/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Чек-лист перед сделкой' })).toBeInTheDocument();
  });

  it('opens everything in free mode', () => {
    useSettings.setState({ freeMode: true });
    renderPage();
    expect(screen.getByText(/Post-Only/)).toBeInTheDocument();
    expect(screen.queryByText(/Откроется, когда/)).not.toBeInTheDocument();
  });

  it('checklist counts items and resets', () => {
    renderPage();
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(PRE_TRADE_CHECKLIST.length);
    for (const box of boxes) fireEvent.click(box);
    expect(screen.getByText(/Все пункты выполнены/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить' }));
    expect(screen.getByText(/Отмечено 0 из/)).toBeInTheDocument();
  });
});
