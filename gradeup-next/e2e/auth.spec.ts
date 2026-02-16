import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in|welcome back/i })).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/login');

    // Try to submit the form without filling it
    await page.getByRole('button', { name: /sign in/i }).click();

    // Check for validation errors - either inline or after field blur
    const emailInput = page.locator('input[name="email"]');
    await emailInput.focus();
    await emailInput.blur();

    // Should show some form of validation feedback
    await expect(page.getByText(/required|email|invalid/i).first()).toBeVisible();
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /sign up/i }).click();
    await expect(page).toHaveURL('/signup');
  });

  test('should display role selection on signup', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByText(/athlete/i)).toBeVisible();
    await expect(page.getByText(/brand/i)).toBeVisible();
  });

  test('should show social login options', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /apple/i })).toBeVisible();
  });

  test('should have forgot password link', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible();
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /forgot password/i }).click();
    await expect(page).toHaveURL('/forgot-password');
  });

  test('should show remember me checkbox', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('checkbox')).toBeVisible();
  });

  test('email and password fields accept input', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');

    await emailInput.fill('test@example.com');
    await passwordInput.fill('testpassword123');

    await expect(emailInput).toHaveValue('test@example.com');
    await expect(passwordInput).toHaveValue('testpassword123');
  });

  test('password field hides input', async ({ page }) => {
    await page.goto('/login');

    const passwordInput = page.locator('input[name="password"]');
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });
});

test.describe('Athlete Signup', () => {
  test('displays athlete signup form', async ({ page }) => {
    await page.goto('/signup/athlete');

    await expect(page.getByText('Personal Information')).toBeVisible();
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expect(page.locator('input[name="lastName"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('displays athletic information fields', async ({ page }) => {
    await page.goto('/signup/athlete');

    await expect(page.getByText('Athletic Information')).toBeVisible();
    await expect(page.locator('input[name="school"]')).toBeVisible();
    await expect(page.locator('select[name="sport"]')).toBeVisible();
    await expect(page.locator('input[name="position"]')).toBeVisible();
    await expect(page.locator('select[name="year"]')).toBeVisible();
  });

  test('sport dropdown has options', async ({ page }) => {
    await page.goto('/signup/athlete');

    const sportSelect = page.locator('select[name="sport"]');
    await sportSelect.click();

    await expect(page.locator('option', { hasText: 'Football' })).toBeVisible();
    await expect(page.locator('option', { hasText: 'Basketball' })).toBeVisible();
    await expect(page.locator('option', { hasText: 'Soccer' })).toBeVisible();
  });

  test('year dropdown has options', async ({ page }) => {
    await page.goto('/signup/athlete');

    const yearSelect = page.locator('select[name="year"]');
    await yearSelect.click();

    await expect(page.locator('option', { hasText: 'Freshman' })).toBeVisible();
    await expect(page.locator('option', { hasText: 'Sophomore' })).toBeVisible();
    await expect(page.locator('option', { hasText: 'Senior' })).toBeVisible();
  });

  test('has terms and conditions checkbox', async ({ page }) => {
    await page.goto('/signup/athlete');

    const termsCheckbox = page.locator('input[name="agreeToTerms"]');
    await expect(termsCheckbox).toBeVisible();
    await expect(page.getByRole('link', { name: /terms of service/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /privacy policy/i })).toBeVisible();
  });
});

test.describe('Brand Signup', () => {
  test('brand signup page loads', async ({ page }) => {
    await page.goto('/signup/brand');
    await expect(page).toHaveURL('/signup/brand');
  });
});
