import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for GradeUp NIL E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './e2e',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Use 2 workers on CI for balance between speed and stability
  workers: process.env.CI ? 2 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Take screenshot on failure
    screenshot: 'only-on-failure',

    // Record video only when retrying
    video: 'on-first-retry',
  },

  // Only test on Chromium for speed
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Reduce motion to disable heavy animations during tests
        // This triggers prefersReducedMotion checks in the app
        contextOptions: {
          reducedMotion: 'reduce',
        },
      },
    },
  ],

  // Configure the web server
  // Use production server in CI for faster, more reliable tests
  webServer: {
    command: process.env.CI ? 'npm run start' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes to start
  },

  // Global timeout for each test
  timeout: 60 * 1000,

  // Timeout for expect assertions
  expect: {
    timeout: 15 * 1000,
  },
});
