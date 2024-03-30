import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA, VitePWAOptions } from 'vite-plugin-pwa';

const manifestForPlugin: Partial<VitePWAOptions> = {
  registerType: 'prompt',
  includeAssets: ['apple-icon-180.png', 'maskable_icon.png'],
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
    orientation: 'landscape',
  },
};

// https://vitejs.dev/config/
export default defineConfig({
  //base: './',
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
      '@typing': path.resolve(__dirname, './src/typing'),
      '@operations': path.resolve(__dirname, './src/process/operations'),
      '@variables': path.resolve(__dirname, './src/process/variables'),
      '@requests': path.resolve(__dirname, './src/request'),
      '@upload': path.resolve(__dirname, './src/process/upload'),
      '@content': path.resolve(__dirname, './src/process/content'),
      '@items': path.resolve(__dirname, './src/process/items'),
      '@specializations': path.resolve(__dirname, './src/process/specializations'),
      '@import': path.resolve(__dirname, './src/process/import'),
      '@export': path.resolve(__dirname, './src/process/export'),
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
  ],
});
