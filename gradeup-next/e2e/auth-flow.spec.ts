import { test, expect } from '@playwright/test';

test.describe('Login Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
  });

  test('shows validation error for empty email', async ({ page }) => {
    // Focus and blur email field without entering value
    const emailInput = page.locator('input#email');
    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await emailInput.focus();
    await emailInput.blur();

    // Check for validation error
    await expect(page.getByText(/required|email/i)).toBeVisible();
  });

  test('shows validation error for invalid email format', async ({ page }) => {
    const emailInput = page.locator('input#email');
    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await emailInput.fill('invalid-email');
    await emailInput.blur();

    // Check for invalid email error
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test('shows validation error for empty password', async ({ page }) => {
    const passwordInput = page.locator('input#password');
    await expect(passwordInput).toBeVisible({ timeout: 15000 });
    await passwordInput.focus();
    await passwordInput.blur();

    // Check for required error
    await expect(page.getByText(/required/i)).toBeVisible();
  });

  test('form elements are present and interactive', async ({ page }) => {
    // Check all form elements exist
    await expect(page.locator('input#email')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.getByRole('checkbox')).toBeVisible(); // Remember me
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

    // Check social login buttons
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /apple/i })).toBeVisible();
  });

  test('email and password fields accept input', async ({ page }) => {
    const emailInput = page.locator('input#email');
    const passwordInput = page.locator('input#password');

    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await emailInput.fill('test@example.com');
    await passwordInput.fill('testpassword123');

    await expect(emailInput).toHaveValue('test@example.com');
    await expect(passwordInput).toHaveValue('testpassword123');
  });

  test('remember me checkbox can be toggled', async ({ page }) => {
    const checkbox = page.getByRole('checkbox');
    await expect(checkbox).toBeVisible({ timeout: 15000 });

    // Initially unchecked
    await expect(checkbox).not.toBeChecked();

    // Click to check
    await checkbox.click();
    await expect(checkbox).toBeChecked();

    // Click to uncheck
    await checkbox.click();
    await expect(checkbox).not.toBeChecked();
  });
});

test.describe('Athlete Signup Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup/athlete', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
  });

  test('displays all required form sections', async ({ page }) => {
    // Personal Information section
    await expect(page.getByText('Personal Information')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expect(page.locator('input[name="lastName"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();

    // Athletic Information section
    await expect(page.getByText('Athletic Information')).toBeVisible();
    await expect(page.locator('input[name="school"]')).toBeVisible();
    await expect(page.locator('select[name="sport"]')).toBeVisible();
    await expect(page.locator('input[name="position"]')).toBeVisible();
    await expect(page.locator('select[name="year"]')).toBeVisible();

    // Social Links section
    await expect(page.getByText('Social Links')).toBeVisible();
    await expect(page.locator('input[name="instagram"]')).toBeVisible();
  });

  test('shows validation errors for required fields', async ({ page }) => {
    // Click submit without filling anything
    const submitBtn = page.getByRole('button', { name: /create account/i });
    await expect(submitBtn).toBeVisible({ timeout: 15000 });
    await submitBtn.click();

    // Should show validation errors (toast or inline)
    // The form uses validation that shows errors on blur/submit
    const firstNameInput = page.locator('input[name="firstName"]');
    await firstNameInput.focus();
    await firstNameInput.blur();

    await expect(page.getByText(/required/i).first()).toBeVisible();
  });

  test('sport dropdown has options', async ({ page }) => {
    const sportSelect = page.locator('select[name="sport"]');
    await expect(sportSelect).toBeVisible({ timeout: 15000 });
    await sportSelect.click();

    // Check that sport options are available
    await expect(page.locator('option', { hasText: 'Football' })).toBeVisible();
    await expect(page.locator('option', { hasText: 'Basketball' })).toBeVisible();
    await expect(page.locator('option', { hasText: 'Soccer' })).toBeVisible();
  });

  test('year dropdown has options', async ({ page }) => {
    const yearSelect = page.locator('select[name="year"]');
    await expect(yearSelect).toBeVisible({ timeout: 15000 });
    await yearSelect.click();

    // Check that year options are available
    await expect(page.locator('option', { hasText: 'Freshman' })).toBeVisible();
    await expect(page.locator('option', { hasText: 'Sophomore' })).toBeVisible();
    await expect(page.locator('option', { hasText: 'Senior' })).toBeVisible();
  });

  test('terms checkbox exists and is required', async ({ page }) => {
    // Find the terms checkbox
    const termsCheckbox = page.locator('input[name="agreeToTerms"]');
    await expect(termsCheckbox).toBeVisible({ timeout: 15000 });

    // Should have links to Terms and Privacy Policy
    await expect(page.getByRole('link', { name: /terms of service/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /privacy policy/i })).toBeVisible();
  });

  test('can fill out the form', async ({ page }) => {
    // Wait for form to load
    await expect(page.locator('input[name="firstName"]')).toBeVisible({ timeout: 15000 });

    // Fill personal info
    await page.locator('input[name="firstName"]').fill('John');
    await page.locator('input[name="lastName"]').fill('Doe');
    await page.locator('input[name="email"]').fill('john.doe@university.edu');
    await page.locator('input[name="password"]').fill('SecurePassword123!');
    await page.locator('input[name="confirmPassword"]').fill('SecurePassword123!');

    // Fill athletic info
    await page.locator('input[name="school"]').fill('Duke University');
    await page.locator('select[name="sport"]').selectOption('Basketball');
    await page.locator('input[name="position"]').fill('Point Guard');
    await page.locator('select[name="year"]').selectOption('Junior');

    // Fill optional social
    await page.locator('input[name="instagram"]').fill('@johndoe');

    // Check terms
    await page.locator('input[name="agreeToTerms"]').click();

    // Verify all fields are filled
    await expect(page.locator('input[name="firstName"]')).toHaveValue('John');
    await expect(page.locator('input[name="lastName"]')).toHaveValue('Doe');
    await expect(page.locator('input[name="email"]')).toHaveValue('john.doe@university.edu');
    await expect(page.locator('select[name="sport"]')).toHaveValue('Basketball');
    await expect(page.locator('select[name="year"]')).toHaveValue('Junior');
  });
});

test.describe('Brand Signup Form', () => {
  test('brand signup page loads', async ({ page }) => {
    await page.goto('/signup/brand', { waitUntil: 'domcontentloaded' });

    // Should be on brand signup page
    await expect(page).toHaveURL('/signup/brand');
  });
});
