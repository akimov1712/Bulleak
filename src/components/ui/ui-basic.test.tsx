import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';
import { buttonClass } from './styles';
import { IconButton } from './IconButton';
import { Card } from './Card';
import { Badge, Pill } from './Badge';

describe('Button', () => {
  it('fires onClick and defaults to type=button', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Начать</Button>);
    const btn = screen.getByRole('button', { name: 'Начать' });
    expect(btn).toHaveAttribute('type', 'button');
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not fire when disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Нельзя
      </Button>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Нельзя' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('is disabled and busy while loading', () => {
    render(<Button loading>Сохранить</Button>);
    const btn = screen.getByRole('button', { name: 'Сохранить' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });

  it('is activated with the keyboard', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Ок</Button>);
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('buttonClass applies variant and width', () => {
    expect(buttonClass({ variant: 'danger', fullWidth: true })).toContain('bg-bear');
    expect(buttonClass({ fullWidth: true })).toContain('w-full');
  });
});

describe('IconButton', () => {
  it('exposes the label as accessible name', () => {
    render(<IconButton label="Закрыть" icon={<span>×</span>} />);
    expect(screen.getByRole('button', { name: 'Закрыть' })).toBeInTheDocument();
  });
});

describe('Card / Badge / Pill', () => {
  it('renders children', () => {
    render(
      <Card>
        <Badge tone="bull">+1,5R</Badge>
      </Card>,
    );
    expect(screen.getByText('+1,5R')).toHaveClass('text-bull');
  });

  it('Pill reports pressed state', async () => {
    const onClick = vi.fn();
    render(
      <Pill selected onClick={onClick}>
        Риск
      </Pill>,
    );
    const pill = screen.getByRole('button', { name: 'Риск' });
    expect(pill).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(pill);
    expect(onClick).toHaveBeenCalled();
  });
});
