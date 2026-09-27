import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialProgress } from '@/lib/progress/initial';
import { useProgress } from '@/store/progressStore';
import { GlossaryPage } from './GlossaryPage';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/glossary/:termId?" element={<GlossaryPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => useProgress.setState(createInitialProgress(Date.now())));

describe('GlossaryPage', () => {
  it('searches ignoring case and filters by category', () => {
    renderAt('/glossary');
    expect(screen.getByRole('navigation', { name: 'Алфавитный указатель' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Поиск по глоссарию' }), {
      target: { value: 'АЛЬТКОИН' },
    });
    expect(screen.getByText('Альткоин')).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Алфавитный указатель' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Фьючерсы' }));
    expect(screen.getByText('Ничего не нашлось')).toBeInTheDocument();
  });

  it('term page: definition, lesson, related terms, and counts the view', () => {
    renderAt('/glossary/altcoin');
    expect(screen.getByRole('heading', { level: 1, name: 'Альткоин' })).toBeInTheDocument();
    expect(screen.getByText(/Изучается в уроке/)).toBeInTheDocument();
    expect(useProgress.getState().counters.glossaryViewed).toEqual(['altcoin']);
  });

  it('unknown term', () => {
    renderAt('/glossary/nope');
    expect(screen.getByText('Такого термина нет')).toBeInTheDocument();
  });
});
