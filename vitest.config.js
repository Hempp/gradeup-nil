import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use happy-dom for DOM environment
    environment: 'happy-dom',
    // Include test files
    include: ['src/**/*.test.js', 'src/**/*.spec.js', 'tests/**/*.test.js'],
    // Global test utilities
    globals: true,
    // Setup files to run before tests
    setupFiles: ['./tests/setup.js'],
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '*.config.js',
        'tests/setup.js',
      ],
    },
  },
});
