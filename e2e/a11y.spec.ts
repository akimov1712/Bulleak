import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Accessibility (T-902): axe WCAG 2 A/AA on the key pages in both themes. Serious and critical
 * violations fail the run; lessons, tools, exams and the final exam open in free mode, and a
 * passed final shows the certificate.
 */
const PAGES = [
  '/',
  '/path',
  '/module/m03',
  '/lesson/m03-l02',
  '/lesson/m09-l02',
  '/lesson/m11-l02',
  '/lesson/m03-l02/quiz',
  '/exam/m03',
  '/exam/final',
  '/simulator',
  '/simulator/m11-tps-2',
  '/tools',
  '/tools/position',
  '/journal',
  '/journal/new',
  '/glossary',
  '/glossary/leverage',
  '/cheatsheets',
  '/stats',
  '/achievements',
  '/settings',
  '/plan',
  '/certificate',
  '/about',
];

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`a11y · ${scheme}`, () => {
    test.use({ colorScheme: scheme });

    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem(
          'tc-settings',
          JSON.stringify({ state: { freeMode: true, theme: 'system' }, version: 1 }),
        );
        localStorage.setItem(
          'tc-progress',
          JSON.stringify({
            state: {
              xp: 1200,
              profile: { name: 'Тест' },
              exams: { final: { best: 0.9, attempts: 1, passedAt: Date.UTC(2026, 8, 29, 10) } },
            },
            version: 3,
          }),
        );
      });
    });

    for (const route of PAGES) {
      test(`${route} has no serious violations`, async ({ page }) => {
        await page.goto(`./#${route}`);
        await page.locator('main h1').first().waitFor();
        await page.waitForLoadState('networkidle');
        const { violations } = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          // lightweight-charts draws on canvas and adds its own attribution link.
          .exclude('#tv-attr-logo')
          // Fading decorations (the «+XP» badge) are measured mid-animation.
          .exclude('[data-transient]')
          .analyze();
        const serious = violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .map(
            (v) =>
              `${v.id} (${v.impact}): ${v.nodes
                .map((n) => n.target.join(' '))
                .slice(0, 3)
                .join(' | ')}`,
          );
        expect(serious).toEqual([]);
      });
    }
  });
}
