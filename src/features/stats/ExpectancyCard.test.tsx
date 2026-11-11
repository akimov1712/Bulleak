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

describe('sample size verdict', () => {
  it('says nothing about an edge under 30 trades', () => {
    render(<ExpectancyCard rs={[2, 2, 2, -1, 2]} />);
    expect(screen.getByRole('status')).toHaveTextContent('Сделок меньше 30');
  });

  it('calls a clearly positive history positive, without promising the future', () => {
    const rs = Array.from({ length: 40 }, (_, i) => (i % 2 ? 1.2 : 0.8));
    render(<ExpectancyCard rs={rs} />);
    expect(screen.getByRole('status')).toHaveTextContent('не обещание будущей прибыли');
  });

  it('is unclear when the interval crosses zero', () => {
    const rs = Array.from({ length: 40 }, (_, i) => (i % 2 ? 2 : -2));
    render(<ExpectancyCard rs={rs} />);
    expect(screen.getByRole('status')).toHaveTextContent('нельзя отличить преимущество от везения');
  });
});
