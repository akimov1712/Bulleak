import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@mdx-js/rollup';
import remarkGfm from 'remark-gfm';
import type { Plugin } from 'vite';

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
      const loaders = fileURLToPath(new URL('./src/content/loaders.ts', import.meta.url));
      const refresh = (file: string) => {
        if (!file.replaceAll('\\', '/').includes('/src/content/modules/')) return;
        for (const mod of server.moduleGraph.getModulesByFile(loaders) ?? []) {
          server.moduleGraph.invalidateModule(mod);
        }
      };
      server.watcher.on('add', refresh);
      server.watcher.on('unlink', refresh);
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    // MDX must run before the React plugin so lessons compile to JSX first.
    {
      enforce: 'pre',
      ...mdx({ remarkPlugins: [remarkGfm], providerImportSource: '@mdx-js/react' }),
    },
    react({ include: /\.(mdx|tsx?)$/ }),
    tailwindcss(),
    ...(mode === 'pane' ? [refreshContentGlobs()] : []),
  ],
  // The in-app preview pane cannot open the HMR websocket, which makes the Vite client
  // reload in a loop. `--mode pane` (used by .claude/launch.json) turns HMR off there.
  server: mode === 'pane' ? { hmr: false } : undefined,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    // First MDX compile of a lesson can take several seconds when the suite runs in parallel.
    testTimeout: 15_000,
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
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
