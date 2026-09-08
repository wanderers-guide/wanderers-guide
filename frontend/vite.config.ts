import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { execFileSync } from 'node:child_process';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA, VitePWAOptions } from 'vite-plugin-pwa';

// Docker build contexts and exported source archives may have neither Git nor .git.
function releaseRevision(): string {
  const supplied = process.env.RENDER_GIT_COMMIT ?? process.env.GITHUB_SHA;
  if (supplied && /^[a-f0-9]{7,40}$/.test(supplied)) return supplied;
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return 'local';
  }
}

const manifestForPlugin: Partial<VitePWAOptions> = {
  registerType: 'prompt',
  // Native registration lets each tab choose when to reload and preserve its edits.
  injectRegister: false,
  includeAssets: ['apple-icon-180.png', 'maskable_icon.png'],
  workbox: {
    maximumFileSizeToCacheInBytes: 15 * 1024 * 1024, // 15 MiB
    // Developer reports never belong in the offline app. Cache the optional icon set
    // when it is used, without competing with the initial sheet/content download.
    globIgnores: ['**/stats.html', '**/game-icons-*.js'],
    runtimeCaching: [
      {
        urlPattern: /\/assets\/game-icons-[^/]+\.js$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'wg-game-icons',
          expiration: { maxEntries: 3, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [200] },
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
  define: {
    __WG_RELEASE__: JSON.stringify(releaseRevision()),
  },
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
      emitFile: false,
      filename: '.scratch/bundle-stats.html',
    }),
    VitePWA(manifestForPlugin),
  ],
  build: {
    rollupOptions: {
      output: {
        // Give the existing dynamic icon chunk a stable purpose for the cache policy.
        chunkFileNames: (chunk) =>
          chunk.moduleIds.some((id) => id.includes('/react-icons/gi/'))
            ? 'assets/game-icons-[hash].js'
            : 'assets/[name]-[hash].js',
      },
    },
    // Was: a @babel/preset-env pass (targets ios15) running over the whole bundle on top
    // of esbuild — a redundant second transpile. esbuild lowers syntax to the same target
    // in a single pass; 'safari15' preserves the original iOS 15 support intent.
    target: ['es2020', 'safari15'],
  },
});
