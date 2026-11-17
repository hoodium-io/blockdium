import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Vite config.
 *
 * A dev proxy is deliberately NOT used for `/api`. The frontend calls the backend's
 * absolute URL so local development exercises the same cross-origin path as
 * production — which is what makes the CORS configuration real rather than something
 * that only works because a proxy hid it. The backend must therefore allow the dev
 * origin:
 *
 *   BLOCKDIUM_CORS_ORIGINS=http://localhost:5173 make serve
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});

