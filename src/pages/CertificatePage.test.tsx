import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { certificateCode } from '@/lib/certificate';
import { createInitialProgress } from '@/lib/progress/initial';
import { useProgress } from '@/store/progressStore';
import { CertificatePage } from './CertificatePage';

const PASSED = Date.UTC(2026, 8, 29, 10);

const renderPage = () =>
  render(
    <MemoryRouter>
      <CertificatePage />
    </MemoryRouter>,
  );

beforeEach(() => {
  useProgress.setState(createInitialProgress(Date.now()));
});

describe('CertificatePage', () => {
  it('is locked until the final exam is passed', () => {
    renderPage();
    expect(screen.getByText('Сертификат пока не получен')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'К финальному экзамену' })).toHaveAttribute(
      'href',
      '/exam/final',
    );
  });

  it('shows the certificate with name, score and code, and saves a new name', async () => {
    useProgress.setState({ exams: { final: { best: 0.9, attempts: 1, passedAt: PASSED } } });
    const user = userEvent.setup();
    renderPage();
    const card = screen.getByTestId('certificate');
    expect(card).toHaveTextContent('Выпускник курса');
    expect(card).toHaveTextContent('90');
    expect(card).toHaveTextContent(certificateCode('Выпускник курса', PASSED));
    expect(card).toHaveTextContent('персонального учебного курса');
    const input = screen.getByRole('textbox', { name: 'Имя на сертификате' });
    await user.type(input, 'Анна');
    await user.click(screen.getByRole('button', { name: 'Сохранить имя' }));
    expect(useProgress.getState().profile.name).toBe('Анна');
    expect(screen.getByTestId('certificate')).toHaveTextContent(certificateCode('Анна', PASSED));
    expect(screen.getByRole('button', { name: 'Скачать PNG' })).toBeEnabled();
  });
});
