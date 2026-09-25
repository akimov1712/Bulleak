import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

describe('App', () => {
  it('renders the course title', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Трейдинг на Bybit с нуля' }),
    ).toBeInTheDocument();
  });

  it('toggles the theme attribute on <html>', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Тёмная тема' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(screen.getByRole('button', { name: 'Светлая тема' })).toBeInTheDocument();
  });
});
