import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from './routes';
import { paths } from './paths';

function renderAt(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  render(<RouterProvider router={router} />);
  return router;
}

describe('routes', () => {
  it.each([
    [paths.home(), 'Добро пожаловать в курс!'],
    [paths.path(), 'Карта курса'],
    [paths.module('m03'), 'Чтение графика'],
    [paths.lesson('m03-l02'), 'Таймфреймы'],
    [paths.lessonQuiz('m03-l02'), 'Таймфреймы'],
    [paths.exam('m03'), 'Экзамен m03'],
    [paths.simulator(), 'Тренажёр'],
    [paths.simulator('m03-sr-bounce'), 'Тренажёр'],
    [paths.tools(), 'Инструменты'],
    [paths.tools('position'), 'Инструменты'],
    [paths.journal(), 'Журнал сделок'],
    [paths.journalNew(), 'Сделка'],
    [paths.glossary(), 'Глоссарий'],
    [paths.glossary('leverage'), 'Глоссарий'],
    [paths.cheatsheets(), 'Шпаргалки'],
    [paths.stats(), 'Статистика'],
    [paths.achievements(), 'Достижения'],
    [paths.settings(), 'Настройки'],
    [paths.certificate(), 'Сертификат'],
    [paths.plan(), 'Торговый план'],
    [paths.about(), 'О курсе'],
  ])('%s renders "%s"', async (url, heading) => {
    renderAt(url);
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });

  it('shows 404 for unknown urls', async () => {
    renderAt('/no/such/page');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Такой страницы нет' }),
    ).toBeInTheDocument();
  });
});
