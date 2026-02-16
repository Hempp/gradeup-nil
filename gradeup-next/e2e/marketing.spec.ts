import { test, expect } from '@playwright/test';

test.describe('Marketing Pages', () => {
  test('homepage loads correctly', async ({ page }) => {
    await page.goto('/');

    // Check that the page loads
    await expect(page).toHaveURL('/');

    // Verify hero section content is visible
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Check for main CTA buttons
    await expect(page.getByRole('link', { name: /get started|join|sign up/i }).first()).toBeVisible();
  });

  test('homepage displays hero section', async ({ page }) => {
    await page.goto('/');

    // Check hero content
    await expect(page.getByText('Your GPA')).toBeVisible();
    await expect(page.getByText('Is Worth')).toBeVisible();
    await expect(page.getByText('Money.')).toBeVisible();

    // Check for athlete and brand CTAs
    await expect(page.getByRole('link', { name: /join as athlete/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /partner as brand/i })).toBeVisible();
  });

  test('opportunities page loads', async ({ page }) => {
    const response = await page.goto('/opportunities');

    // Should return 200
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL('/opportunities');
  });

  test('help page loads', async ({ page }) => {
    const response = await page.goto('/help');

    // Should return success status
    expect(response?.status()).toBeLessThan(400);

    // Check for help content
    await expect(page.getByRole('heading', { name: /help|support|faq/i }).first()).toBeVisible();
  });

  test('navigation works', async ({ page }) => {
    await page.goto('/');

    // Check nav links exist
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('homepage has navigation header', async ({ page }) => {
    await page.goto('/');

    // Check for header/navigation
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();
  });

  test('homepage athlete CTA navigates to signup', async ({ page }) => {
    await page.goto('/');

    // Click "Join as Athlete" CTA
    const athleteCta = page.getByRole('link', { name: /join as athlete/i }).first();
    await athleteCta.click();

    // Should navigate to athlete signup
    await expect(page).toHaveURL('/signup/athlete');
  });

  test('homepage brand CTA navigates to signup', async ({ page }) => {
    await page.goto('/');

    // Click "Partner as Brand" CTA
    const brandCta = page.getByRole('link', { name: /partner as brand/i }).first();
    await brandCta.click();

    // Should navigate to brand signup
    await expect(page).toHaveURL('/signup/brand');
  });

  test('login page loads correctly', async ({ page }) => {
    await page.goto('/login');

    await expect(page).toHaveURL('/login');
    await expect(page.getByText('Welcome Back')).toBeVisible();
    await expect(page.getByText('Sign in to your GradeUp account')).toBeVisible();
  });

  test('signup page loads correctly', async ({ page }) => {
    await page.goto('/signup');

    await expect(page).toHaveURL('/signup');
    await expect(page.getByText('Join GradeUp')).toBeVisible();
    await expect(page.getByText('Choose your account type to get started')).toBeVisible();
  });

  test('can navigate between signup types', async ({ page }) => {
    await page.goto('/signup');

    // Click on athlete signup card
    await page.click('text=I\'m an Athlete');
    await expect(page).toHaveURL('/signup/athlete');

    // Go back and click brand
    await page.goto('/signup');
    await page.click('text=I\'m a Brand');
    await expect(page).toHaveURL('/signup/brand');
  });

  test('forgot password page loads', async ({ page }) => {
    const response = await page.goto('/forgot-password');

    expect(response?.status()).toBeLessThan(400);
    await expect(page).toHaveURL('/forgot-password');
  });
});

test.describe('Page Accessibility', () => {
  test('homepage has proper heading structure', async ({ page }) => {
    await page.goto('/');

    // Should have an h1
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
  });

  test('login page has proper form labels', async ({ page }) => {
    await page.goto('/login');

    // Form inputs should be present and accessible
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('signup page has accessible role cards', async ({ page }) => {
    await page.goto('/signup');

    // Role selection cards should be clickable
    const athleteCard = page.getByText("I'm an Athlete");
    const brandCard = page.getByText("I'm a Brand");

    await expect(athleteCard).toBeVisible();
    await expect(brandCard).toBeVisible();
  });
});
