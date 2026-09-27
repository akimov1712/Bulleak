import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { CalcEmbed } from './CalcEmbed';
import { CALCULATOR_LIST } from './registry';

beforeEach(() => localStorage.clear());

describe('CalcEmbed', () => {
  it.each(CALCULATOR_LIST.map((c) => c.id))('%s renders in a lesson with a result', (id) => {
    const { container } = render(<CalcEmbed id={id} />);
    // Same component as on /tools/:id: a labelled group with a reset button and no dash hint
    // for the defaults.
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Сбросить' })).toBeInTheDocument();
    expect(container.querySelector('[data-calc-empty]')).toBeNull();
  });

  it('explains an unknown id', () => {
    render(<CalcEmbed id="nope" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Калькулятор «nope» не найден');
  });
});
