import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';
import { Popover } from './Popover';
import { Toaster } from './Toaster';
import { EmptyState } from './Skeleton';
import { toast, useUi } from '@/store/uiStore';

function ModalDemo({ dismissible = true }: { dismissible?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        открыть
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Сбросить прогресс?"
        dismissible={dismissible}
        footer={
          <>
            <button type="button">Отмена</button>
            <button type="button">Сбросить</button>
          </>
        }
      >
        <input aria-label="Подтверждение" />
      </Modal>
    </>
  );
}

describe('Modal', () => {
  it('opens as a labelled dialog and moves focus inside', async () => {
    render(<ModalDemo />);
    await userEvent.click(screen.getByRole('button', { name: 'открыть' }));
    const dialog = screen.getByRole('dialog', { name: 'Сбросить прогресс?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('closes on Escape and restores focus to the trigger', async () => {
    render(<ModalDemo />);
    const trigger = screen.getByRole('button', { name: 'открыть' });
    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });

  it('traps Tab focus inside the dialog', async () => {
    render(<ModalDemo />);
    await userEvent.click(screen.getByRole('button', { name: 'открыть' }));
    const dialog = screen.getByRole('dialog');
    for (let i = 0; i < 6; i++) {
      await userEvent.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
    await userEvent.tab({ shift: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('ignores Escape when not dismissible', async () => {
    render(<ModalDemo dismissible={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'открыть' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Закрыть' })).not.toBeInTheDocument();
  });
});

describe('Popover', () => {
  it('toggles content on click and closes on Escape', async () => {
    render(
      <Popover content={<p>Плечо — отношение позиции к марже.</p>}>
        <button type="button">плечо</button>
      </Popover>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'плечо' }));
    expect(await screen.findByText('Плечо — отношение позиции к марже.')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('Плечо — отношение позиции к марже.')).not.toBeInTheDocument();
  });
});

describe('Toaster', () => {
  afterEach(() => {
    vi.useRealTimers();
    useUi.setState({ toasts: [] });
  });

  it('shows toasts, auto-dismisses them and caps the stack', () => {
    vi.useFakeTimers();
    render(<Toaster />);
    act(() => {
      toast({ tone: 'xp', title: '+50 XP', icon: '⭐', durationMs: 1000 });
    });
    expect(screen.getByText('+50 XP')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(useUi.getState().toasts).toHaveLength(0);

    act(() => {
      for (let i = 0; i < 6; i++) toast({ tone: 'info', title: `t${i}` });
    });
    expect(useUi.getState().toasts.map((t) => t.title)).toEqual(['t2', 't3', 't4', 't5']);
  });

  it('can be dismissed manually', async () => {
    render(<Toaster />);
    act(() => {
      toast({ tone: 'success', title: 'Сохранено' });
    });
    await userEvent.click(screen.getByRole('button', { name: 'Скрыть уведомление' }));
    expect(useUi.getState().toasts).toHaveLength(0);
  });
});

describe('EmptyState', () => {
  it('renders title, description and action', () => {
    render(
      <EmptyState
        title="Пока пусто"
        description="Добавь первую сделку"
        action={<button type="button">Добавить</button>}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Пока пусто' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Добавить' })).toBeInTheDocument();
  });
});
