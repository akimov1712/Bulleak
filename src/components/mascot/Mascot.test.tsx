import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Mascot } from './Mascot';
import { MascotSay } from './MascotSay';
import { MOOD_LIST } from './moods';

describe('Mascot', () => {
  it.each(MOOD_LIST)('renders the %s mood', (mood) => {
    const { container } = render(<Mascot mood={mood} />);
    expect(container.querySelector(`svg[data-mood="${mood}"]`)).not.toBeNull();
  });

  it('is decorative without a title and an image with one', () => {
    const { container, rerender } = render(<Mascot />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    rerender(<Mascot title="Буллик радуется" />);
    expect(screen.getByRole('img', { name: 'Буллик радуется' })).toBeInTheDocument();
  });

  it('draws visibly different faces per mood', () => {
    const markup = MOOD_LIST.map((mood) => render(<Mascot mood={mood} />).container.innerHTML);
    expect(new Set(markup).size).toBe(MOOD_LIST.length);
  });
});

describe('MascotSay', () => {
  it('renders the speech bubble text', () => {
    render(<MascotSay mood="pointing">Начни с первого урока!</MascotSay>);
    expect(screen.getByText('Начни с первого урока!')).toBeInTheDocument();
  });
});
