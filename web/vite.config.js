import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // 11.2: without this, Rollup's default per-dynamic-import splitting gives every
        // individually-imported lucide-react icon its own ~1KB chunk file — a lazy-loaded page
        // like PropertyPage was firing 5-6 separate tiny HTTP requests just for icons, each
        // paying full request overhead (measured: 500-700ms each under throttled mobile,
        // serialized behind the page's own chunk). Bundling the icon library (and other shared
        // vendor deps that don't change per-route) into one chunk means one shared request that
        // every route reuses from cache after the first page load.
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['framer-motion', 'lucide-react'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
