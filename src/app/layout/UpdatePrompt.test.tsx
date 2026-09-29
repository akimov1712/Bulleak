import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UpdatePrompt } from './UpdatePrompt';

const sw = vi.hoisted(() => ({
  needRefresh: true,
  setNeedRefresh: vi.fn(),
  updateServiceWorker: vi.fn(() => Promise.resolve()),
}));

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [sw.needRefresh, sw.setNeedRefresh],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: sw.updateServiceWorker,
  }),
}));

describe('UpdatePrompt', () => {
  it('offers to apply a downloaded version or to postpone it', async () => {
    const user = userEvent.setup();
    render(<UpdatePrompt />);
    expect(screen.getByText('Доступна новая версия курса')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Обновить' }));
    expect(sw.updateServiceWorker).toHaveBeenCalledWith(true);
    await user.click(screen.getByRole('button', { name: 'Позже' }));
    expect(sw.setNeedRefresh).toHaveBeenCalledWith(false);
  });

  it('shows nothing without an update', () => {
    sw.needRefresh = false;
    const { container } = render(<UpdatePrompt />);
    expect(container).toBeEmptyDOMElement();
  });
});
