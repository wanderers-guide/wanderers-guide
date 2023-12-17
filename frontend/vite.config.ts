import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
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
      '@import': path.resolve(__dirname, './src/process/import'),
      '@export': path.resolve(__dirname, './src/process/export'),
      '@css': path.resolve(__dirname, './src/css'),
      '@ai': path.resolve(__dirname, './src/ai'),
    },
  },
  plugins: [react()],
});
