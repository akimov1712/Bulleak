import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExpectancyCard } from './ExpectancyCard';

describe('ExpectancyCard', () => {
  it('shows the mean with its interval and the number of trades', () => {
    render(<ExpectancyCard rs={[2, -1, -1, 2, -1]} />);
    const card = screen.getByLabelText('Матожидание');
    expect(card).toHaveTextContent('+0,2R');
    expect(card).toHaveTextContent(/интервал 90\s?%/);
    expect(card).toHaveTextContent('по 5 сделкам');
  });

  it('hides with fewer than two trades', () => {
    const { container } = render(<ExpectancyCard rs={[1]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
