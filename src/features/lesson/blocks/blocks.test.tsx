import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MDXProvider } from '@mdx-js/react';
import { loadLesson } from '@/content/loaders';
import { mdxComponents } from '../mdxComponents';
import { Checklist, Figure } from './Blocks';

beforeEach(() => localStorage.clear());

describe('lesson blocks in the sample lesson', () => {
  it('renders every block type', async () => {
    const Lesson = await loadLesson('m00-l01');
    render(
      <MDXProvider components={mdxComponents}>
        <Lesson />
      </MDXProvider>,
    );
    expect(screen.getByRole('region', { name: 'Что узнаешь' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Итоги урока' })).toHaveAttribute(
      'data-lesson-summary',
    );
    expect(
      screen.getByRole('complementary', { name: 'Без правил трейдинг — это казино' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Совет' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Сделка на 100 $' })).toBeInTheDocument();
    expect(screen.getByText('Проверь себя: зачем трейдеру стоп-лосс?')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    // h2 headings get stable anchors for the table of contents
    expect(screen.getByRole('heading', { level: 2, name: 'Стили торговли' })).toHaveAttribute(
      'id',
      'стили-торговли',
    );
  });
});

describe('Checklist', () => {
  it('toggles items, shows progress and remembers state', async () => {
    const items = ['Первый', 'Второй'];
    const { unmount } = render(<Checklist id="t" items={items} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Первый' }));
    expect(screen.getByRole('checkbox', { name: 'Первый' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByText('1/2')).toBeInTheDocument();
    unmount();
    render(<Checklist id="t" items={items} />);
    expect(screen.getByRole('checkbox', { name: 'Первый' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('checkbox', { name: 'Второй' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('survives corrupted storage', () => {
    localStorage.setItem('tc-checklist:bad', '{not json');
    render(<Checklist id="bad" items={['Пункт']} />);
    expect(screen.getByRole('checkbox', { name: 'Пункт' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });
});

describe('Figure', () => {
  it('prefixes local images with the base url and shows the credit', () => {
    render(<Figure src="/img/covers/m00.webp" alt="График" credit="Unsplash" caption="Подпись" />);
    expect(screen.getByRole('img', { name: 'График' })).toHaveAttribute(
      'src',
      '/img/covers/m00.webp',
    );
    expect(screen.getByText('Источник: Unsplash')).toBeInTheDocument();
  });
});
