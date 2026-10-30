import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { CommandPalette } from './CommandPalette';
import { SEARCH_INDEX } from './searchIndex';

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function setup() {
  const onClose = vi.fn();
  render(
    <MemoryRouter>
      <CommandPalette open onClose={onClose} />
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
  return { onClose, user: userEvent.setup() };
}

describe('SEARCH_INDEX', () => {
  it('has unique ids and covers every kind', () => {
    const ids = SEARCH_INDEX.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    const kinds = new Set(SEARCH_INDEX.map((i) => i.kind));
    expect([...kinds].sort()).toEqual(['cheatsheet', 'lesson', 'module', 'page', 'term', 'tool']);
  });
});

describe('CommandPalette', () => {
  it('lists sections before typing', () => {
    setup();
    expect(screen.getByRole('combobox', { name: 'Поиск по курсу' })).toHaveFocus();
    expect(screen.getByRole('option', { name: /Тренажёр/ })).toBeInTheDocument();
  });

  it('filters, moves with arrows and opens with Enter', async () => {
    const { user, onClose } = setup();
    await user.type(screen.getByRole('combobox'), 'размер позиции');
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveTextContent('Размер позиции');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Enter}');
    expect(onClose).toHaveBeenCalled();
    expect(screen.getByTestId('where')).toHaveTextContent('/tools/position');
  });

  it('wraps around with the arrow keys', async () => {
    const { user } = setup();
    await user.keyboard('{ArrowUp}');
    const options = screen.getAllByRole('option');
    expect(options.at(-1)).toHaveAttribute('aria-selected', 'true');
  });

  it('says when nothing is found', async () => {
    const { user } = setup();
    await user.type(screen.getByRole('combobox'), 'qwxzv');
    expect(screen.getByText(/Ничего не нашлось/)).toBeInTheDocument();
  });
});
