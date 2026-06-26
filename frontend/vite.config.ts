import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA, VitePWAOptions } from 'vite-plugin-pwa';
import babel from '@rollup/plugin-babel';

const manifestForPlugin: Partial<VitePWAOptions> = {
  // 'autoUpdate' lets a new deploy's service worker activate + claim clients immediately
  // (skipWaiting + clientsClaim). Combined with Vite's content-hashed asset filenames this
  // serves fresh assets without the old "wipe all caches every load" hack in main.tsx, so
  // returning visitors get cache hits instead of re-downloading the whole app each visit.
  registerType: 'autoUpdate',
  includeAssets: ['apple-icon-180.png', 'maskable_icon.png'],
  workbox: {
    // Keep the ~6.9MB game-icons monolith out of the precache manifest so the service worker
    // doesn't re-download it in the background on first visit — it loads on demand and is then
    // served from the browser HTTP cache (it's a content-hashed, immutable asset). Also skip
    // stats.html (the build-analysis report). The app shell and other lazy chunks stay precached.
    globIgnores: ['**/game-icons-*.js', '**/stats.html'],
    runtimeCaching: [
      {
        // Supabase Storage images (portraits, content artwork, backgrounds). Use
        // StaleWhileRevalidate (NOT CacheFirst): portraits are mutable at a stable URL, so
        // CacheFirst could pin a stale portrait for weeks after a user changes it — SWR serves
        // the cached copy instantly and refreshes it in the background. Covers both the raw
        // object and render/image transform URLs.
        urlPattern: ({ url }) =>
          url.pathname.includes('/storage/v1/') && /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(url.pathname),
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'wg-storage-images',
          expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 30 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        // External art (Archives of Nethys creature images, dicebear avatars) — opaque cross-origin.
        urlPattern: ({ url }) => url.hostname === '2e.aonprd.com' || url.hostname === 'api.dicebear.com',
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'wg-external-images',
          expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 14 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
  manifest: {
    name: "Wanderer's Guide",
    short_name: "Wanderer's Guide",
    description: 'A character builder and digital toolbox for Pathfinder and Starfinder Second Edition.',
    icons: [
      {
        src: '/apple-icon-180.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/maskable_icon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/maskable_icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    theme_color: '#141517',
    background_color: '#141517',
    display: 'standalone',
    scope: '/',
    start_url: '/',
    orientation: 'portrait-primary',
  },
};

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@assets': path.resolve(__dirname, './src/assets'),
      '@atoms': path.resolve(__dirname, './src/atoms'),
      '@common': path.resolve(__dirname, './src/common'),
      '@drawers': path.resolve(__dirname, './src/drawers'),
      '@nav': path.resolve(__dirname, './src/nav'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@modals': path.resolve(__dirname, './src/modals'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@auth': path.resolve(__dirname, './src/auth'),
      '@schemas': path.resolve(__dirname, './src/schemas'),
      '@operations': path.resolve(__dirname, './src/process/operations'),
      '@variables': path.resolve(__dirname, './src/process/variables'),
      '@requests': path.resolve(__dirname, './src/request'),
      '@upload': path.resolve(__dirname, './src/process/upload'),
      '@content': path.resolve(__dirname, './src/process/content'),
      '@items': path.resolve(__dirname, './src/process/items'),
      '@specializations': path.resolve(__dirname, './src/process/specializations'),
      '@import': path.resolve(__dirname, './src/process/import'),
      '@export': path.resolve(__dirname, './src/process/export'),
      '@homebrew': path.resolve(__dirname, './src/process/homebrew'),
      '@conditions': path.resolve(__dirname, './src/process/conditions'),
      '@spells': path.resolve(__dirname, './src/process/spells'),
      '@css': path.resolve(__dirname, './src/css'),
      '@ai': path.resolve(__dirname, './src/ai'),
    },
  },
  plugins: [
    react(),
    visualizer({
      emitFile: true,
      filename: 'stats.html',
    }),
    VitePWA(manifestForPlugin),
    babel({
      babelHelpers: 'bundled',
      presets: [['@babel/preset-env', { targets: { ios: '15' } }]],
      extensions: ['.ts', '.js', '.tsx'],
    }),
  ],
  build: {
    target: 'es2020',
    modulePreload: {
      // Don't eagerly <link rel="modulepreload"> the game-icons chunk: it's a 6.9MB on-demand
      // monolith (loaded only when a game icon actually renders), so preloading it would pull the
      // bytes onto the first-paint path. Everything else the entry statically imports keeps its
      // preload so it downloads in parallel with the entry (NOT filtering editor/mathjs/charts/
      // framer here: they are still statically imported by the app shell, so stripping their
      // preload would only delay them — de-eagering them needs a separate refactor).
      resolveDependencies: (_url, deps) => deps.filter((dep) => !dep.includes('game-icons')),
    },
    rollupOptions: {
      output: {
        // Split large, stable vendors into their own long-cached chunks so an app-code
        // deploy doesn't invalidate the whole download, and so the browser can fetch them
        // in parallel.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // react-icons/gi is a ~6.9MB monolith. Pin it to its OWN chunk so Rollup doesn't
          // hoist the shared module into the eager entry chunk. With no static importer left
          // on the first-paint path (see src/common/Icon.tsx, which now dynamic-imports it),
          // this chunk is only fetched on demand when a game icon actually renders.
          if (id.includes('react-icons/gi')) return 'game-icons';
          // The shared react-icons runtime (lib/GenIcon) and any small icon sets we DO import
          // statically (e.g. react-icons/bi in the editor toolbar) must NOT land in the gi chunk:
          // otherwise needing the tiny GenIcon helper drags the whole 6.9MB monolith onto the
          // eager path. Keep them in a small, separate vendor chunk.
          if (id.includes('react-icons')) return 'icons-vendor';
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id))
            return 'react';
          if (id.includes('@mantine')) return 'mantine';
          if (id.includes('@tiptap') || id.includes('prosemirror')) return 'editor';
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('mathjs') || id.includes('decimal.js')) return 'mathjs';
          if (id.includes('recharts') || id.includes('/d3-') || id.includes('victory')) return 'charts';
          if (id.includes('pdf-lib')) return 'pdf';
          if (id.includes('framer-motion')) return 'framer';
        },
      },
    },
  },
});
