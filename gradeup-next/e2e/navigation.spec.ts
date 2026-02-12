import { test, expect } from '@playwright/test';

test.describe('Basic Navigation', () => {
  test('home page loads and displays hero section', async ({ page }) => {
    await page.goto('/');

    // Check that the page loads
    await expect(page).toHaveURL('/');

    // Verify hero section content is visible
    await expect(page.getByText('Your GPA')).toBeVisible();
    await expect(page.getByText('Is Worth')).toBeVisible();
    await expect(page.getByText('Money.')).toBeVisible();

    // Check for main CTA buttons
    await expect(page.getByRole('link', { name: /join as athlete/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /partner as brand/i })).toBeVisible();
  });

  test('can navigate to login page', async ({ page }) => {
    await page.goto('/');

    // Click on login link (usually in header/nav)
    await page.goto('/login');

    // Verify we're on the login page
    await expect(page).toHaveURL('/login');
    await expect(page.getByText('Welcome Back')).toBeVisible();
    await expect(page.getByText('Sign in to your GradeUp account')).toBeVisible();
  });

  test('can navigate to signup page', async ({ page }) => {
    await page.goto('/signup');

    // Verify we're on the signup page
    await expect(page).toHaveURL('/signup');
    await expect(page.getByText('Join GradeUp')).toBeVisible();
    await expect(page.getByText('Choose your account type to get started')).toBeVisible();

    // Check that role selection cards are visible
    await expect(page.getByText("I'm an Athlete")).toBeVisible();
    await expect(page.getByText("I'm a Brand")).toBeVisible();
  });

  test('can navigate to athlete signup from signup page', async ({ page }) => {
    await page.goto('/signup');

    // Click on athlete signup card
    await page.click('text=I\'m an Athlete');

    // Verify navigation to athlete signup
    await expect(page).toHaveURL('/signup/athlete');
    await expect(page.getByText('Create Athlete Account')).toBeVisible();
  });

  test('can navigate to brand signup from signup page', async ({ page }) => {
    await page.goto('/signup');

    // Click on brand signup card
    await page.click('text=I\'m a Brand');

    // Verify navigation to brand signup
    await expect(page).toHaveURL('/signup/brand');
  });

  test('login page has link to signup', async ({ page }) => {
    await page.goto('/login');

    // Check for signup link
    const signupLink = page.getByRole('link', { name: 'Sign up' });
    await expect(signupLink).toBeVisible();

    // Click and verify navigation
    await signupLink.click();
    await expect(page).toHaveURL('/signup');
  });

  test('signup page has link to login', async ({ page }) => {
    await page.goto('/signup');

    // Check for login link
    const loginLink = page.getByRole('link', { name: 'Sign in' });
    await expect(loginLink).toBeVisible();

    // Click and verify navigation
    await loginLink.click();
    await expect(page).toHaveURL('/login');
  });

  test('can navigate to forgot password from login', async ({ page }) => {
    await page.goto('/login');

    // Check for forgot password link
    const forgotLink = page.getByRole('link', { name: /forgot password/i });
    await expect(forgotLink).toBeVisible();

    // Click and verify navigation
    await forgotLink.click();
    await expect(page).toHaveURL('/forgot-password');
  });

  test('hero section CTAs navigate correctly', async ({ page }) => {
    await page.goto('/');

    // Click "Join as Athlete" CTA
    const athleteCta = page.getByRole('link', { name: /join as athlete/i }).first();
    await expect(athleteCta).toBeVisible();
    await athleteCta.click();

    // Should navigate to athlete signup
    await expect(page).toHaveURL('/signup/athlete');
  });
});
