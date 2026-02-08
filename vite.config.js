import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readdirSync } from 'fs';

// Auto-discover all HTML files for multi-page app
const htmlFiles = readdirSync(__dirname)
  .filter(file => file.endsWith('.html'))
  .reduce((entries, file) => {
    const name = file.replace('.html', '');
    entries[name] = resolve(__dirname, file);
    return entries;
  }, {});

export default defineConfig({
  build: {
    rollupOptions: {
      input: htmlFiles,
      output: {
        // Organize output files
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        // PERFORMANCE: Manual chunk splitting for better caching
        manualChunks: {
          // Core utilities shared across all pages
          'core': [
            './src/config.js',
            './src/utils/security.js',
            './src/utils/formatters.js',
            './src/utils/error-handler.js',
          ],
          // Dashboard shared code
          'dashboard-core': [
            './src/dashboard.js',
            './src/dashboard-init.js',
            './src/utils/dom-helpers.js',
          ],
          // Services layer
          'services': [
            './src/services/supabase.js',
            './src/services/auth.js',
            './src/services/helpers.js',
          ],
        },
      },
    },
    // Minification settings (esbuild is built into Vite)
    minify: 'esbuild',
    // SECURITY: Disable source maps in production
    sourcemap: process.env.NODE_ENV !== 'production',
    // Output directory
    outDir: 'dist',
  },
  // Development server
  server: {
    port: 3000,
    open: true,
  },
  // Preview server (for testing production build)
  preview: {
    port: 4173,
  },
});
