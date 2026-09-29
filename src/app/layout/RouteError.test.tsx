import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { RouteError } from './RouteError';

function Boom(): never {
  throw new Error('render exploded');
}

describe('RouteError', () => {
  it('replaces a crashed page with a friendly screen and copies the details', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const router = createMemoryRouter([{ path: '/', Component: Boom, ErrorBoundary: RouteError }]);
    render(<RouterProvider router={router} />);
    expect(await screen.findByRole('heading', { name: 'Что-то пошло не так' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Обновить страницу' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Скопировать детали ошибки' }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Error: render exploded'));
    expect(await screen.findByRole('button', { name: 'Детали скопированы' })).toBeInTheDocument();
  });

  it('asks for a reload when a chunk of an older version is missing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    function Stale(): never {
      throw new TypeError('Failed to fetch dynamically imported module: /assets/x.js');
    }
    const router = createMemoryRouter([{ path: '/', Component: Stale, ErrorBoundary: RouteError }]);
    render(<RouterProvider router={router} />);
    expect(await screen.findByRole('heading', { name: 'Сайт обновился' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Скопировать/ })).not.toBeInTheDocument();
  });
});
