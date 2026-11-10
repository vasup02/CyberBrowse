import { defineConfig } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(import.meta.url));

// Vite configuration for a Chrome/Chromium extension (Manifest V3)
export default defineConfig({
  root: resolve(projectRoot, 'src'),
  publicDir: resolve(projectRoot, 'public'),
  build: {
    outDir: resolve(projectRoot, '..', 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        newtab: resolve(projectRoot, 'src/newtab/newtab.html'),
        options: resolve(projectRoot, 'src/options/options.html'),
        background: resolve(projectRoot, 'src/background/index.ts'),
      },
    },
  },
  // No extra plugins needed for now – Vite will handle HTML & TS.
});
