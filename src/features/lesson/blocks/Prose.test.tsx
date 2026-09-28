import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { A } from './Prose';

describe('A', () => {
  it('routes app paths through the router and opens external links in a new tab', () => {
    render(
      <MemoryRouter>
        <A href="/plan">План</A>
        <A href="https://example.com">Сайт</A>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'План' })).toHaveAttribute('href', '/plan');
    expect(screen.getByRole('link', { name: 'План' })).not.toHaveAttribute('target');
    expect(screen.getByRole('link', { name: 'Сайт' })).toHaveAttribute('target', '_blank');
  });
});
