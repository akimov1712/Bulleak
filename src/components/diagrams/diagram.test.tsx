import { render, screen } from '@testing-library/react';
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

  it('shows a visible warning for an unknown name', () => {
    expect(isDiagramName('toString')).toBe(false);
    render(<Diagram name="nope" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Схема «nope» не найдена');
  });
});
