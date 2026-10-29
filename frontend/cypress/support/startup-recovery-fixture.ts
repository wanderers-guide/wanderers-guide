import { createServer, type Server } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { transformSync } from 'esbuild';

/** Serve isolated app shells and a deliberately broken worker, never a production origin. */
export function registerStartupRecoveryFixture(on: Cypress.PluginEvents): void {
  let server: Server | undefined;
  let networkLoads = 0;
  let recovered = false;
  let stalled = false;
  const bootstrap = transformSync(readFileSync(resolve('src/startup-recovery.ts'), 'utf8'), {
    loader: 'ts',
    target: 'es2020',
    minify: true,
  }).code;
  const shell = (entry: string): string =>
    `<!doctype html><html><head><script>${bootstrap}</script></head><body><div id="root"></div>${entry}</body></html>`;
  const stalledShell = shell(
    '<script>void fetch("/stalled");</script><script type="module" src="/stale-entry.js"></script>'
  );
  const recoveredShell = shell(
    '<script type="module">window.dispatchEvent(new Event("wg:app-started"));document.getElementById("root").textContent="Recovered app";void fetch("/recovered");</script>'
  );
  const editor = shell(
    '<script type="module">window.dispatchEvent(new Event("wg:app-started"));document.getElementById("root").innerHTML=\'<label>Unsaved note<input aria-label="Unsaved note"></label>\';</script>'
  );
  on('task', {
    async 'startupRecovery:start'(): Promise<string> {
      // Cypress reloads the spec when the AUT changes origin; reuse the same local server.
      const existingAddress = server?.address();
      if (existingAddress && typeof existingAddress !== 'string') return `http://127.0.0.1:${existingAddress.port}`;
      networkLoads = 0;
      recovered = false;
      stalled = false;
      server = createServer((request, response) => {
        const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
        response.setHeader('cache-control', 'no-store');
        if (pathname === '/stalled') {
          stalled = true;
          response.end('ok');
          return;
        }
        if (pathname === '/recovered') {
          recovered = true;
          response.end('ok');
          return;
        }
        if (pathname === '/sw.js') {
          response.setHeader('content-type', 'application/javascript');
          response.end(`
            self.addEventListener('install', event => event.waitUntil((async () => {
              const cache = await caches.open('startup-recovery-fixture');
              await cache.add('/stale-shell');
              await self.skipWaiting();
            })()));
            self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
            self.addEventListener('fetch', event => {
              const url = new URL(event.request.url);
              if (url.pathname === '/stuck') event.respondWith(caches.match('/stale-shell'));
              if (url.pathname === '/stale-entry.js') event.respondWith(new Promise(() => {}));
            });
          `);
        } else {
          response.setHeader('content-type', 'text/html');
          if (pathname === '/stuck') networkLoads++;
          response.end(pathname === '/editor' ? editor : pathname === '/stale-shell' ? stalledShell : recoveredShell);
        }
      });
      await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve));
      server.unref();
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Missing fixture port');
      return `http://127.0.0.1:${address.port}`;
    },
    'startupRecovery:state': (): { networkLoads: number; recovered: boolean; stalled: boolean } => ({
      networkLoads,
      recovered,
      stalled,
    }),
    async 'startupRecovery:stop'(): Promise<null> {
      await new Promise<void>((resolve) => {
        if (!server) return resolve();
        server.close(() => resolve());
        server.closeAllConnections();
      });
      server = undefined;
      return null;
    },
  });
}
