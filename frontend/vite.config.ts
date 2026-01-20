import { defineConfig } from 'vite';

export default defineConfig({
  base: '/app/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'terser',
    target: 'es2020',
  },
  server: {
    port: 5173,
    proxy: {
      '/pools': 'http://localhost:3000',
      '/api': 'http://localhost:3000',
    },
  },
});
