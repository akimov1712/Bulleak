import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '@/app/routes';
import { PRIVACY_CONTACT_URL } from '@/content/legal';

describe('PrivacyPage', () => {
  it('explains storage and links to the account settings and the contact', async () => {
    render(
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/privacy'] })} />,
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Политика конфиденциальности' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Где и сколько' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'настройках' })).toHaveAttribute('href', '/settings');
    expect(screen.getByRole('link', { name: 'в обсуждениях проекта на GitHub' })).toHaveAttribute(
      'href',
      PRIVACY_CONTACT_URL,
    );
    // The footer of every page links here.
    expect(screen.getByRole('link', { name: 'Конфиденциальность' })).toHaveAttribute(
      'href',
      '/privacy',
    );
  });
});
