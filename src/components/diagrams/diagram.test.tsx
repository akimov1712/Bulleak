import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Diagram } from './Diagram';
import { DIAGRAM_LOADERS, diagramComponent, isDiagramName } from './registry';

afterEach(() => {
  delete DIAGRAM_LOADERS['test-diagram'];
});

describe('Diagram', () => {
  it('renders a registered diagram lazily with a caption', async () => {
    DIAGRAM_LOADERS['test-diagram'] = () =>
      Promise.resolve({ default: () => <svg role="img" aria-label="Тестовая схема" /> });
    expect(isDiagramName('test-diagram')).toBe(true);
    expect(diagramComponent('test-diagram')).toBe(diagramComponent('test-diagram'));
    render(<Diagram name="test-diagram" caption="Подпись" />);
    expect(await screen.findByRole('img', { name: 'Тестовая схема' })).toBeInTheDocument();
    expect(screen.getByText('Подпись')).toBeInTheDocument();
  });

  it.each(Object.keys(DIAGRAM_LOADERS).filter((n) => n !== 'test-diagram'))(
    '%s renders with an accessible name',
    async (name) => {
      render(<Diagram name={name} />);
      const img = await screen.findByRole('img');
      expect(img.getAttribute('aria-label')?.length).toBeGreaterThan(20);
    },
  );

  it('shows a visible warning for an unknown name', () => {
    expect(isDiagramName('toString')).toBe(false);
    render(<Diagram name="nope" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Схема «nope» не найдена');
  });
});

describe('interactive diagrams', () => {
  it('order book: a market buy walks the asks and reports slippage', async () => {
    render(<Diagram name="order-book" />);
    fireEvent.click(await screen.findByRole('button', { name: /2,5 BTC/ }));
    expect(screen.getByText(/Средняя цена/)).toHaveTextContent('Задело уровней: 4');
    expect(screen.getByRole('button', { name: /2,5 BTC/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('order types: moving the price fires the touched orders and reset clears them', async () => {
    render(<Diagram name="order-types" />);
    const slider = await screen.findByRole('slider');
    fireEvent.change(slider, { target: { value: '63000' } });
    fireEvent.change(slider, { target: { value: '65000' } });
    expect(screen.getByText(/Сработали:/)).toHaveTextContent('лимит на покупку');
    expect(screen.getByText(/Сработали:/)).not.toHaveTextContent('стоп-лосс');
    fireEvent.click(screen.getByRole('button', { name: 'Сброс' }));
    expect(screen.getByText(/Пока ничего не сработало/)).toBeInTheDocument();
  });
});
