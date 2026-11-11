import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DEFAULT_SETTINGS, useSettings } from '@/store/settingsStore';
import { TOURS } from '@/content/tours';
import { Tour } from './Tour';

beforeEach(() => useSettings.setState(DEFAULT_SETTINGS));

describe('Tour', () => {
  it('walks through the steps, highlights the target and is not shown again', () => {
    render(
      <>
        <div data-tour="continue">target</div>
        <Tour id="home" />
      </>,
    );
    expect(screen.getByText(TOURS.home[0]?.title ?? '')).toBeInTheDocument();
    expect(screen.getByText('target')).toHaveClass('ring-2');
    for (let i = 1; i < TOURS.home.length; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Дальше' }));
    }
    expect(screen.getByText('target')).not.toHaveClass('ring-2');
    fireEvent.click(screen.getByRole('button', { name: 'Понятно' }));
    expect(screen.queryByLabelText('Знакомство')).not.toBeInTheDocument();
    expect(useSettings.getState().toursSeen).toEqual(['home']);
  });

  it('can be skipped', () => {
    render(<Tour id="simulator" />);
    fireEvent.click(screen.getByRole('button', { name: 'Пропустить знакомство' }));
    expect(useSettings.getState().toursSeen).toEqual(['simulator']);
  });
});
