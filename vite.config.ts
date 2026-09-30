import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@mdx-js/rollup';
import remarkGfm from 'remark-gfm';
import { normalizePath, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Without HMR (pane mode) Vite does not re-run import.meta.glob when files are added,
 * so a new lesson folder stays "missing" until restart. Invalidate the module that
 * owns the content globs whenever a content file appears or disappears.
 */
function refreshContentGlobs(): Plugin {
  return {
    name: 'refresh-content-globs',
    apply: 'serve',
    configureServer(server) {
      // The module graph keys files by forward-slash paths, also on Windows.
      const loaders = normalizePath(
        fileURLToPath(new URL('./src/content/loaders.ts', import.meta.url)),
      );
      const refresh = (file: string) => {
        if (!file.replaceAll('\\', '/').includes('/src/content/modules/')) return;
        const mods = server.moduleGraph.getModulesByFile(loaders);
        server.config.logger.info(`[refresh-content-globs] ${file} -> ${mods?.size ?? 0}`);
        for (const mod of mods ?? []) {
          server.moduleGraph.invalidateModule(mod);
        }
      };
      server.watcher.on('add', refresh);
      server.watcher.on('unlink', refresh);
    },
  };
}

/**
 * Vite puts the module preloads before the stylesheet. The stylesheet blocks the first paint,
 * so on a slow network it should not queue behind ~350 kB of preloaded JS: move it up.
 */
function stylesheetFirst(): Plugin {
  return {
    name: 'stylesheet-first',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const links = html.match(/<link rel="stylesheet"[^>]*>/g) ?? [];
        if (links.length === 0) return html;
        const stripped = links.reduce((acc, link) => acc.replace(link, ''), html);
        const first = stripped.indexOf('<link rel="modulepreload"');
        if (first < 0) return html;
        return `${stripped.slice(0, first)}${links.join('')}${stripped.slice(first)}`;
      },
    },
  };
}

/** Hash route (first segment, «quiz» / «entry» variants) → page component file name. */
const ROUTE_PAGES: Record<string, string> = {
  module: 'ModulePage',
  lesson: 'LessonPage',
  quiz: 'QuizPage',
  exam: 'ExamPage',
  simulator: 'SimulatorPage',
  tools: 'ToolsPage',
  journal: 'JournalPage',
  entry: 'JournalEntryPage',
  glossary: 'GlossaryPage',
  cheatsheets: 'CheatsheetsPage',
  stats: 'StatsPage',
  achievements: 'AchievementsPage',
  settings: 'SettingsPage',
  certificate: 'CertificatePage',
  plan: 'PlanPage',
  about: 'AboutPage',
};

/**
 * Route pages are lazy chunks the router asks for only after the app JS has run. On a slow
 * network that is a second round of downloads before the page can paint. An inline script
 * reads the hash at load and preloads the current page's chunks alongside the app bundle.
 */
function preloadRoutePage(): Plugin {
  let base = '/';
  return {
    name: 'preload-route-page',
    apply: 'build',
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle;
        if (!bundle) return html;
        const chunks = Object.values(bundle).filter((c) => c.type === 'chunk');
        const entry = chunks.find((c) => c.isEntry);
        const onStart = new Set([entry?.fileName, ...(entry?.imports ?? [])]);
        const byFile = new Map(chunks.map((c) => [c.fileName, c]));
        const deps = (file: string, seen = new Set<string>()): Set<string> => {
          if (seen.has(file) || onStart.has(file)) return seen;
          seen.add(file);
          for (const dep of byFile.get(file)?.imports ?? []) deps(dep, seen);
          return seen;
        };
        const map: Record<string, string[]> = {};
        for (const [route, page] of Object.entries(ROUTE_PAGES)) {
          const chunk = chunks.find((c) => c.facadeModuleId?.endsWith(`/src/pages/${page}.tsx`));
          if (chunk) map[route] = [...deps(chunk.fileName)].map((f) => base + f);
        }
        const script =
          `<script>(function(){var m=${JSON.stringify(map)};` +
          `var p=location.hash.replace(/^#\\/?/,'').split(/[?\\/]/);` +
          `var k=p[0]==='lesson'&&p[2]==='quiz'?'quiz':p[0]==='journal'&&p[1]?'entry':p[0];` +
          `(m[k]||[]).forEach(function(u){var l=document.createElement('link');` +
          `l.rel='modulepreload';l.href=u;document.head.appendChild(l);});})();</script>`;
        return html.replace('</head>', `${script}\n  </head>`);
      },
    },
  };
}

export default defineConfig(({ mode }) => ({
  // GitHub Pages serves the site under /<repo>/ (set by the deploy workflow); locally — root.
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    // MDX must run before the React plugin so lessons compile to JSX first.
    {
      enforce: 'pre',
      ...mdx({ remarkPlugins: [remarkGfm], providerImportSource: '@mdx-js/react' }),
    },
    react({ include: /\.(mdx|tsx?)$/ }),
    tailwindcss(),
    VitePWA({
      // The app asks before switching to a new version (UpdatePrompt), never mid-lesson.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'robots.txt', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Bulleak — трейдинг на Bybit с нуля',
        short_name: 'Bulleak',
        description:
          'Интерактивный курс по криптотрейдингу на Bybit: с нуля до своей свинг-стратегии.',
        lang: 'ru',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f7f8fc',
        theme_color: '#16C26A',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Everything the course needs offline: app chunks, fonts, icons and the candle data.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json,txt}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
    }),
    stylesheetFirst(),
    preloadRoutePage(),
    ...(mode === 'pane' ? [refreshContentGlobs()] : []),
  ],
  // The in-app preview pane cannot open the HMR websocket, which makes the Vite client
  // reload in a loop. `--mode pane` (used by .claude/launch.json) turns HMR off there.
  server: mode === 'pane' ? { hmr: false } : undefined,
  build: {
    rolldownOptions: {
      output: {
        // Framework code changes rarely: separate vendor chunks cache across app updates.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'router', test: /node_modules[\\/]react-router/ },
            { name: 'floating', test: /node_modules[\\/](@floating-ui|tabbable)[\\/]/ },
          ],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    alias: {
      // The PWA plugin's virtual module only exists in dev/build.
      'virtual:pwa-register/react': fileURLToPath(
        new URL('./src/test/pwaRegisterStub.ts', import.meta.url),
      ),
    },
    // First MDX compile of a lesson can take several seconds when the suite runs in parallel.
    testTimeout: 15_000,
    // Each worker holds a jsdom + MDX compiler; with the default (cores − 1) workers the
    // 8 GB machine ran out of memory (V8 "Zone Allocation failed") in some runs, even at 4.
    maxWorkers: 2,
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts', 'shared/src/**/*.test.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/**/*.test.ts'],
      thresholds: { lines: 90 },
      reporter: ['text', 'html'],
    },
  },
}));
