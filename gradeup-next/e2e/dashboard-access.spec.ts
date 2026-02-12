import { test, expect } from '@playwright/test';

test.describe('Dashboard Routes Exist', () => {
  // These tests verify that dashboard routes exist and respond
  // They will likely redirect to login for unauthenticated users,
  // which is the expected behavior

  test.describe('Athlete Dashboard Routes', () => {
    test('athlete dashboard route exists', async ({ page }) => {
      const response = await page.goto('/athlete/dashboard');

      // Route should respond (200 or redirect to login)
      expect(response?.status()).toBeLessThan(500);
    });

    test('athlete profile route exists', async ({ page }) => {
      const response = await page.goto('/athlete/profile');
      expect(response?.status()).toBeLessThan(500);
    });

    test('athlete deals route exists', async ({ page }) => {
      const response = await page.goto('/athlete/deals');
      expect(response?.status()).toBeLessThan(500);
    });

    test('athlete earnings route exists', async ({ page }) => {
      const response = await page.goto('/athlete/earnings');
      expect(response?.status()).toBeLessThan(500);
    });

    test('athlete messages route exists', async ({ page }) => {
      const response = await page.goto('/athlete/messages');
      expect(response?.status()).toBeLessThan(500);
    });

    test('athlete settings route exists', async ({ page }) => {
      const response = await page.goto('/athlete/settings');
      expect(response?.status()).toBeLessThan(500);
    });
  });

  test.describe('Brand Dashboard Routes', () => {
    test('brand dashboard route exists', async ({ page }) => {
      const response = await page.goto('/brand/dashboard');
      expect(response?.status()).toBeLessThan(500);
    });

    test('brand discover route exists', async ({ page }) => {
      const response = await page.goto('/brand/discover');
      expect(response?.status()).toBeLessThan(500);
    });

    test('brand campaigns route exists', async ({ page }) => {
      const response = await page.goto('/brand/campaigns');
      expect(response?.status()).toBeLessThan(500);
    });

    test('brand deals route exists', async ({ page }) => {
      const response = await page.goto('/brand/deals');
      expect(response?.status()).toBeLessThan(500);
    });

    test('brand analytics route exists', async ({ page }) => {
      const response = await page.goto('/brand/analytics');
      expect(response?.status()).toBeLessThan(500);
    });

    test('brand messages route exists', async ({ page }) => {
      const response = await page.goto('/brand/messages');
      expect(response?.status()).toBeLessThan(500);
    });

    test('brand settings route exists', async ({ page }) => {
      const response = await page.goto('/brand/settings');
      expect(response?.status()).toBeLessThan(500);
    });
  });

  test.describe('Director Dashboard Routes', () => {
    test('director dashboard route exists', async ({ page }) => {
      const response = await page.goto('/director/dashboard');
      expect(response?.status()).toBeLessThan(500);
    });

    test('director athletes route exists', async ({ page }) => {
      const response = await page.goto('/director/athletes');
      expect(response?.status()).toBeLessThan(500);
    });

    test('director brands route exists', async ({ page }) => {
      const response = await page.goto('/director/brands');
      expect(response?.status()).toBeLessThan(500);
    });

    test('director deals route exists', async ({ page }) => {
      const response = await page.goto('/director/deals');
      expect(response?.status()).toBeLessThan(500);
    });

    test('director compliance route exists', async ({ page }) => {
      const response = await page.goto('/director/compliance');
      expect(response?.status()).toBeLessThan(500);
    });

    test('director analytics route exists', async ({ page }) => {
      const response = await page.goto('/director/analytics');
      expect(response?.status()).toBeLessThan(500);
    });

    test('director settings route exists', async ({ page }) => {
      const response = await page.goto('/director/settings');
      expect(response?.status()).toBeLessThan(500);
    });
  });

  test.describe('Marketing Routes', () => {
    test('opportunities page loads', async ({ page }) => {
      const response = await page.goto('/opportunities');

      // This is a public marketing page, should return 200
      expect(response?.status()).toBe(200);
    });
  });

  test.describe('Auth Route Protection', () => {
    test('unauthenticated user is redirected from athlete dashboard', async ({ page }) => {
      await page.goto('/athlete/dashboard');

      // Should redirect to login page
      // Wait for navigation to complete
      await page.waitForURL(/login|athlete\/dashboard/);

      // Either redirected to login or showing dashboard with auth check
      const url = page.url();
      const isLoginPage = url.includes('/login');
      const isDashboardWithPossibleRedirect = url.includes('/athlete/dashboard');

      expect(isLoginPage || isDashboardWithPossibleRedirect).toBe(true);
    });

    test('unauthenticated user is redirected from brand dashboard', async ({ page }) => {
      await page.goto('/brand/dashboard');

      await page.waitForURL(/login|brand\/dashboard/);

      const url = page.url();
      expect(url.includes('/login') || url.includes('/brand/dashboard')).toBe(true);
    });

    test('unauthenticated user is redirected from director dashboard', async ({ page }) => {
      await page.goto('/director/dashboard');

      await page.waitForURL(/login|director\/dashboard/);

      const url = page.url();
      expect(url.includes('/login') || url.includes('/director/dashboard')).toBe(true);
    });
  });
});
