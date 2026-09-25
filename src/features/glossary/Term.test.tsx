import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { Term } from './Term';
import { glossary } from '@/content/glossary';

describe('Term', () => {
  it('shows the short definition on click and on keyboard focus', async () => {
    render(
      <MemoryRouter>
        <p>
          Главное — <Term id="edge">преимущество</Term> стратегии.
        </p>
      </MemoryRouter>,
    );
    const trigger = screen.getByRole('button', { name: 'преимущество' });
    await userEvent.tab();
    expect(trigger).toHaveFocus();
    expect(await screen.findByText(/Статистическое преимущество стратегии/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Подробнее в глоссарии' })).toHaveAttribute(
      'href',
      '/glossary/edge',
    );
  });

  it('throws in dev for unknown ids so broken links are caught early', () => {
    expect(() => render(<Term id="no-such-term">x</Term>)).toThrow(/неизвестный термин/);
  });
});

describe('glossary data', () => {
  it('has unique ids, non-empty texts and valid related links', () => {
    const ids = new Set(glossary.map((t) => t.id));
    expect(ids.size).toBe(glossary.length);
    for (const t of glossary) {
      expect(t.short.length).toBeGreaterThan(10);
      expect(t.full.length).toBeGreaterThan(t.short.length);
      for (const r of t.related) expect(ids.has(r), `${t.id} → ${r}`).toBe(true);
    }
  });
});
