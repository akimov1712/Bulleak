/**
 * Responsive audit (T-901): horizontal overflow, touch targets under 44 px and content hidden
 * under the bottom nav, on the main pages (6 widths × themes) or all lessons (375 px).
 * Needs the dev server: `npm run dev`, then `node scripts/audit-responsive.mjs pages|lessons`.
 * AUDIT_URL overrides http://127.0.0.1:5173. Report: test-results/audit-<mode>.json.
 */
import fs from 'node:fs';
import { chromium } from '@playwright/test';
const BASE = process.env.AUDIT_URL ?? 'http://127.0.0.1:5173';
const root = 'src/content/modules';
const lessons = fs.readdirSync(root).flatMap((m) =>
  fs
    .readdirSync(`${root}/${m}`)
    .filter((l) => l.startsWith('l'))
    .map((l) => `/lesson/${m}-${l}`),
);
const pages = [
  '/',
  '/path',
  '/module/m03',
  '/lesson/m03-l02',
  '/lesson/m03-l02/quiz',
  '/exam/m03',
  '/exam/final',
  '/simulator',
  '/simulator/m11-tps-2',
  '/tools',
  '/tools/position',
  '/tools/liquidation',
  '/tools/rr',
  '/tools/expectancy',
  '/tools/drawdown',
  '/tools/montecarlo',
  '/tools/fees',
  '/tools/compounding',
  '/journal',
  '/journal/new',
  '/glossary',
  '/glossary/leverage',
  '/cheatsheets',
  '/stats',
  '/achievements',
  '/settings',
  '/certificate',
  '/plan',
  '/about',
];
const mode = process.argv[2] || 'pages';
const browser = await chromium.launch();
const results = [];
const combos =
  mode === 'lessons'
    ? [[375, 'light']]
    : [
        [375, 'light'],
        [375, 'dark'],
        [414, 'light'],
        [768, 'dark'],
        [1024, 'light'],
        [1440, 'dark'],
      ];
for (const [w, scheme] of combos) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: 900 },
    colorScheme: scheme,
    hasTouch: w < 768,
  });
  await ctx.addInitScript(() => {
    localStorage.setItem(
      'tc-settings',
      JSON.stringify({ state: { freeMode: true, theme: 'system' }, version: 1 }),
    );
    if (!localStorage.getItem('tc-progress'))
      localStorage.setItem(
        'tc-progress',
        JSON.stringify({
          state: {
            xp: 12500,
            profile: { name: 'Анна Смирнова' },
            exams: { final: { best: 0.9, attempts: 1, passedAt: Date.UTC(2026, 8, 29, 10) } },
          },
          version: 3,
        }),
      );
  });
  const page = await ctx.newPage();
  for (const route of mode === 'lessons' ? lessons : pages) {
    const errors = [];
    const onErr = (e) => errors.push(String(e).slice(0, 120));
    page.on('pageerror', onErr);
    await page.goto(`${BASE}/#${route}`);
    await page.waitForTimeout(mode === 'lessons' ? 1200 : 1500);
    const r = await page.evaluate(() => {
      const vw = innerWidth;
      const overflow = document.documentElement.scrollWidth - vw;
      const wide =
        overflow > 0
          ? [...document.querySelectorAll('body *')]
              .filter(
                (e) =>
                  e.getBoundingClientRect().right > vw + 1 && !e.closest('[data-allow-overflow]'),
              )
              .slice(0, 3)
              .map(
                (e) => e.tagName + '.' + String(e.className?.baseVal ?? e.className).slice(0, 50),
              )
          : [];
      const small = [
        ...document.querySelectorAll(
          'a, button, input, select, textarea, [role=radio], [role=tab], [role=checkbox]',
        ),
      ]
        .filter((e) => {
          const b = e.getBoundingClientRect();
          if (b.width === 0 || b.height === 0) return false;
          const st = getComputedStyle(e);
          if (st.visibility === 'hidden') return false;
          if (e.closest('p, li') && e.tagName === 'A' && !e.className.includes('rounded'))
            return false; // inline text links
          if (e.classList.contains('sr-only')) return false; // skip link, visible on focus only
          if (e.closest('p, li, td') && e.tagName === 'BUTTON' && e.getAttribute('aria-haspopup'))
            return false; // <Term> inside text
          if (
            e.closest('#tv-attr-logo') ||
            e.id === 'tv-attr-logo' ||
            (e.tagName === 'A' && e.getAttribute('href')?.includes('tradingview'))
          )
            return false; // chart attribution
          if (
            e.tagName === 'INPUT' &&
            e.closest('label') &&
            e.closest('label').getBoundingClientRect().height >= 44
          )
            return false; // labelled checkbox
          let h = b.height,
            w = b.width;
          const pb = getComputedStyle(e, '::before');
          if (pb.content !== 'none' && pb.position === 'absolute') {
            const n = (v) => (v === 'auto' ? 0 : parseFloat(v) || 0);
            h = Math.max(h, b.height - n(pb.top) - n(pb.bottom));
            w = Math.max(w, b.width - n(pb.left) - n(pb.right));
          }
          return (h < 44 && w < 44) || h < 32;
        })
        .map(
          (e) =>
            (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 30) +
            ' ' +
            Math.round(e.getBoundingClientRect().width) +
            'x' +
            Math.round(e.getBoundingClientRect().height),
        );
      const nav = document.querySelector(
        'nav[aria-label="Основная навигация"], nav.fixed, nav[class*="fixed"]',
      );
      let hidden = null;
      if (
        nav &&
        getComputedStyle(nav).position === 'fixed' &&
        nav.getBoundingClientRect().top > 100
      ) {
        scrollTo(0, document.documentElement.scrollHeight);
        const navTop = nav.getBoundingClientRect().top;
        const last = [...document.querySelectorAll('main *')]
          .filter((e) => e.children.length === 0 && e.getBoundingClientRect().height > 0)
          .pop();
        if (last && last.getBoundingClientRect().bottom > navTop + 1)
          hidden = (last.textContent || last.tagName).trim().slice(0, 40);
      }
      return { overflow, wide, small: [...new Set(small)].slice(0, 8), hidden };
    });
    page.off('pageerror', onErr);
    if (r.overflow > 0 || r.small.length || r.hidden || errors.length)
      results.push({ route, w, scheme, ...r, errors });
  }
  await ctx.close();
}
await browser.close();
fs.mkdirSync('test-results', { recursive: true });
fs.writeFileSync(`test-results/audit-${mode}.json`, JSON.stringify(results, null, 1));
console.log('issues', results.length);
for (const x of results)
  console.log(
    x.w,
    x.scheme,
    x.route,
    'ovf',
    x.overflow,
    x.wide.join(','),
    '| small:',
    x.small.join('; '),
    x.hidden ? '| hidden: ' + x.hidden : '',
    x.errors.join(' '),
  );
