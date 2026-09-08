import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/** Separate development entry point: the reference never enters the released app. */
export default defineConfig({
  root: __dirname,
  publicDir: false,
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5175, strictPort: true },
  build: { outDir: path.resolve(__dirname, '../../../../../.scratch/mobile-sheet-prototype'), emptyOutDir: true },
});
