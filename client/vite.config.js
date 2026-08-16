import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The dev server proxies /api to Express so the browser sees one origin and
// the auth cookie just works - no CORS juggling while developing.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Listen on the network too, so a phone on the same Wi-Fi can open the
    // app at http://<this-PC's-IP>:5173 during demos.
    host: true,
    // Let a Cloudflare quick tunnel reach the dev server for remote demos.
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
