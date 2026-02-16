import { test, expect } from '@playwright/test';

test.describe('Basic Navigation', () => {
  test('home page loads and displays hero section', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Check that the page loads
    await expect(page).toHaveURL('/');

    // Verify hero section content is visible - use h1 selector for flexibility
    await expect(page.locator('h1').filter({ hasText: /your gpa/i })).toBeVisible({ timeout: 20000 });
    await expect(page.locator('h1').filter({ hasText: /is worth/i })).toBeVisible();
    await expect(page.locator('h1').filter({ hasText: /money/i })).toBeVisible();

    // Check for main CTA buttons
    await expect(page.getByRole('link', { name: /join as athlete/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /partner as brand/i })).toBeVisible();
  });

  test('can navigate to login page', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Verify we're on the login page
    await expect(page).toHaveURL('/login');
    await expect(page.getByText('Welcome Back')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Sign in to your GradeUp account')).toBeVisible();
  });

  test('can navigate to signup page', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Verify we're on the signup page
    await expect(page).toHaveURL('/signup');
    await expect(page.getByText('Join GradeUp')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Choose your account type to get started')).toBeVisible();

    // Check that role selection cards are visible
    await expect(page.getByText("I'm an Athlete")).toBeVisible();
    await expect(page.getByText("I'm a Brand")).toBeVisible();
  });

  test('can navigate to athlete signup from signup page', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Click on athlete signup card
    const athleteCard = page.getByText("I'm an Athlete");
    await expect(athleteCard).toBeVisible({ timeout: 15000 });
    await athleteCard.click();

    // Verify navigation to athlete signup
    await expect(page).toHaveURL('/signup/athlete');
  });

  test('can navigate to brand signup from signup page', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Click on brand signup card
    const brandCard = page.getByText("I'm a Brand");
    await expect(brandCard).toBeVisible({ timeout: 15000 });
    await brandCard.click();

    // Verify navigation to brand signup
    await expect(page).toHaveURL('/signup/brand');
  });

  test('login page has link to signup', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Check for signup link - be flexible with text matching
    const signupLink = page.getByRole('link', { name: /sign up/i });
    await expect(signupLink).toBeVisible({ timeout: 15000 });

    // Click and verify navigation
    await signupLink.click();
    await expect(page).toHaveURL('/signup');
  });

  test('signup page has link to login', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Check for login link
    const loginLink = page.getByRole('link', { name: /sign in/i });
    await expect(loginLink).toBeVisible({ timeout: 15000 });

    // Click and verify navigation
    await loginLink.click();
    await expect(page).toHaveURL('/login');
  });

  test('can navigate to forgot password from login', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Check for forgot password link
    const forgotLink = page.getByRole('link', { name: /forgot password/i });
    await expect(forgotLink).toBeVisible({ timeout: 15000 });

    // Click and verify navigation
    await forgotLink.click();
    await expect(page).toHaveURL('/forgot-password');
  });

  test('hero section CTAs navigate correctly', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Click "Join as Athlete" CTA
    const athleteCta = page.getByRole('link', { name: /join as athlete/i }).first();
    await expect(athleteCta).toBeVisible({ timeout: 20000 });
    await athleteCta.click();

    // Should navigate to athlete signup
    await expect(page).toHaveURL('/signup/athlete');
  });
});
