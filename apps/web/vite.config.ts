import react from '@vitejs/plugin-react';
import { createReadStream, statSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const contentTypes: Record<string, string> = {
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
};

const assetsRoot = path.resolve(import.meta.dirname, '../../packages/p5r-ds/assets');

// Dev only: the game images are gitignored and must never reach a production bundle,
// so they are streamed from the design system folder instead of living in public/.
function p5rAssets(): Plugin {
  return {
    name: 'p5r-assets-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/p5r-assets', (req, res, next) => {
        const requested = decodeURIComponent((req.url ?? '/').split('?')[0]);
        const file = path.resolve(assetsRoot, '.' + requested);
        if (!file.startsWith(assetsRoot + path.sep) || !statSync(file, { throwIfNoEntry: false })?.isFile()) {
          next();
          return;
        }
        res.setHeader('Content-Type', contentTypes[path.extname(file)] ?? 'application/octet-stream');
        createReadStream(file).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), p5rAssets()],
  server: {
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:8080',
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            proxyReq.setHeader('X-Forwarded-Host', req.headers.host ?? '');
            proxyReq.setHeader('X-Forwarded-Proto', 'http');
          });
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['../../vitest.setup.ts'],
  },
});
