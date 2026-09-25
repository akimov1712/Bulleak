import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NumberInput } from './NumberInput';
import { Field } from './Field';
import { Tabs } from './Tabs';
import { Switch } from './Switch';
import { ProgressBar } from './ProgressBar';
import { ProgressRing } from './ProgressRing';
import { Select } from './Input';

function ControlledNumber({
  onValue,
  min,
  max,
}: {
  onValue: (v: number | null) => void;
  min?: number;
  max?: number;
}) {
  const [value, setValue] = useState<number | null>(null);
  return (
    <>
      <Field label="Депозит">
        {({ id, describedBy }) => (
          <NumberInput
            id={id}
            aria-describedby={describedBy}
            value={value}
            min={min}
            max={max}
            unit="$"
            onValueChange={(v) => {
              setValue(v);
              onValue(v);
            }}
          />
        )}
      </Field>
      <button type="button" onClick={() => setValue(500)}>
        сброс
      </button>
    </>
  );
}

describe('NumberInput', () => {
  it('parses comma decimals and spaces', async () => {
    const onValue = vi.fn();
    render(<ControlledNumber onValue={onValue} />);
    await userEvent.type(screen.getByLabelText('Депозит'), '1 234,5');
    expect(onValue).toHaveBeenLastCalledWith(1234.5);
  });

  it('emits null for empty or invalid text', async () => {
    const onValue = vi.fn();
    render(<ControlledNumber onValue={onValue} />);
    const input = screen.getByLabelText('Депозит');
    await userEvent.type(input, 'abc');
    expect(onValue).toHaveBeenLastCalledWith(null);
    await userEvent.clear(input);
    expect(onValue).toHaveBeenLastCalledWith(null);
  });

  it('clears invalid text on blur so it matches the null value', async () => {
    render(<ControlledNumber onValue={() => {}} />);
    const input = screen.getByLabelText('Депозит');
    await userEvent.type(input, 'abc');
    await userEvent.tab();
    expect(input).toHaveValue('');
  });

  it('clamps to bounds on blur', async () => {
    const onValue = vi.fn();
    render(<ControlledNumber onValue={onValue} min={0} max={100} />);
    const input = screen.getByLabelText('Депозит');
    await userEvent.type(input, '250');
    await userEvent.tab();
    expect(onValue).toHaveBeenLastCalledWith(100);
    expect(input).toHaveValue('100');
  });

  it('syncs text when the value changes from outside', async () => {
    render(<ControlledNumber onValue={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'сброс' }));
    expect(screen.getByLabelText('Депозит')).toHaveValue('500');
  });
});

describe('Field', () => {
  it('shows an error and marks it as alert', () => {
    render(
      <Field label="Стоп" hint="Ставь стоп за структурой" error="Стоп должен быть ниже входа">
        {({ id, describedBy, invalid }) => (
          <input id={id} aria-describedby={describedBy} aria-invalid={invalid} />
        )}
      </Field>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Стоп должен быть ниже входа');
    const input = screen.getByLabelText('Стоп');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    // every id in aria-describedby must exist
    for (const id of (input.getAttribute('aria-describedby') ?? '').split(' ')) {
      expect(document.getElementById(id)).not.toBeNull();
    }
  });
});

describe('Tabs', () => {
  function Demo() {
    const [tab, setTab] = useState<'a' | 'b' | 'c'>('a');
    return (
      <Tabs
        label="Разделы"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'a', label: 'Обучение' },
          { id: 'b', label: 'Тренажёр' },
          { id: 'c', label: 'Журнал' },
        ]}
      />
    );
  }

  it('moves selection with arrow keys and wraps around', async () => {
    render(<Demo />);
    await userEvent.tab();
    expect(screen.getByRole('tab', { name: 'Обучение' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Тренажёр' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Журнал' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'Обучение' })).toHaveFocus();
  });
});

describe('Switch', () => {
  it('toggles via label click', async () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onCheckedChange={onChange} label="Звуки" />);
    await userEvent.click(screen.getByText('Звуки'));
    expect(onChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('switch', { name: 'Звуки' })).toHaveAttribute('aria-checked', 'false');
  });
});

describe('Select', () => {
  it('emits the chosen value', async () => {
    const onChange = vi.fn();
    render(
      <Select
        aria-label="Цель дня"
        value="50"
        onValueChange={onChange}
        options={[
          { value: '20', label: '20 XP' },
          { value: '50', label: '50 XP' },
        ]}
      />,
    );
    await userEvent.selectOptions(screen.getByLabelText('Цель дня'), '20');
    expect(onChange).toHaveBeenCalledWith('20');
  });
});

describe('Progress', () => {
  it('clamps values and exposes aria attributes', () => {
    render(
      <>
        <ProgressBar label="Модуль" value={1.7} valueText="5/5" />
        <ProgressRing label="Цель дня" value={Number.NaN} />
      </>,
    );
    expect(screen.getByRole('progressbar', { name: 'Модуль' })).toHaveAttribute(
      'aria-valuenow',
      '100',
    );
    expect(screen.getByRole('progressbar', { name: 'Цель дня' })).toHaveAttribute(
      'aria-valuenow',
      '0',
    );
  });
});
