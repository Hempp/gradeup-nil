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
      },
    },
    // Minification settings (esbuild is built into Vite)
    minify: 'esbuild',
    // Generate source maps for debugging
    sourcemap: true,
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
