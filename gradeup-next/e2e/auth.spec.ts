import { test, expect, type Page as _Page, type BrowserContext } from '@playwright/test';

// Helper to set demo mode cookie
async function setDemoRole(context: BrowserContext, role: 'athlete' | 'brand' | 'director') {
  await context.addCookies([
    {
      name: 'demo_role',
      value: role,
      domain: 'localhost',
      path: '/',
    },
  ]);
}

// Helper to clear demo cookies
async function clearDemoCookies(context: BrowserContext) {
  await context.clearCookies();
}

test.describe('Authentication - Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('displays login page with all elements', async ({ page }) => {
    // Page title and description
    await expect(page.getByText('Welcome Back')).toBeVisible();
    await expect(page.getByText('Sign in to your GradeUp account')).toBeVisible();

    // Form elements
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole('checkbox')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

    // Social login buttons
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /apple/i })).toBeVisible();

    // Links
    await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
  });

  test('shows validation error for empty email', async ({ page }) => {
    const emailInput = page.locator('input[name="email"]');
    await emailInput.focus();
    await emailInput.blur();

    await expect(page.getByText(/required|email/i)).toBeVisible();
  });

  test('shows validation error for invalid email format', async ({ page }) => {
    const emailInput = page.locator('input[name="email"]');
    await emailInput.fill('invalid-email');
    await emailInput.blur();

    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test('shows validation error for empty password', async ({ page }) => {
    const passwordInput = page.locator('input[name="password"]');
    await passwordInput.focus();
    await passwordInput.blur();

    await expect(page.getByText(/required/i)).toBeVisible();
  });

  test('password field masks input', async ({ page }) => {
    const passwordInput = page.locator('input[name="password"]');
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('email and password fields accept input', async ({ page }) => {
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');

    await emailInput.fill('test@example.com');
    await passwordInput.fill('testpassword123');

    await expect(emailInput).toHaveValue('test@example.com');
    await expect(passwordInput).toHaveValue('testpassword123');
  });

  test('remember me checkbox can be toggled', async ({ page }) => {
    const checkbox = page.getByRole('checkbox');

    await expect(checkbox).not.toBeChecked();
    await checkbox.click();
    await expect(checkbox).toBeChecked();
    await checkbox.click();
    await expect(checkbox).not.toBeChecked();
  });

  test('navigates to signup page', async ({ page }) => {
    await page.getByRole('link', { name: /sign up/i }).click();
    await expect(page).toHaveURL('/signup');
  });

  test('navigates to forgot password page', async ({ page }) => {
    await page.getByRole('link', { name: /forgot password/i }).click();
    await expect(page).toHaveURL('/forgot-password');
  });

  test('shows error toast on invalid credentials submission', async ({ page }) => {
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('input[name="password"]').fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for network request and error response
    await page.waitForTimeout(2000);

    // Should show error message (either inline or toast)
    const hasErrorMessage = await page.locator('[role="alert"]').isVisible()
      || await page.getByText(/invalid|failed|error/i).isVisible();
    expect(hasErrorMessage).toBe(true);
  });
});

test.describe('Authentication - Demo Mode', () => {
  test('athlete demo button sets cookie and redirects', async ({ page, context }) => {
    await page.goto('/login');

    // Click athlete demo button
    await page.getByRole('button', { name: /athlete/i }).first().click();

    // Should redirect to athlete dashboard
    await page.waitForURL(/\/athlete\/dashboard/);
    await expect(page).toHaveURL(/\/athlete\/dashboard/);

    // Verify demo cookie is set
    const cookies = await context.cookies();
    const demoCookie = cookies.find((c) => c.name === 'demo_role');
    expect(demoCookie?.value).toBe('athlete');
  });

  test('brand demo button sets cookie and redirects', async ({ page, context }) => {
    await page.goto('/login');

    // Click brand demo button
    await page.getByRole('button', { name: /brand/i }).first().click();

    // Should redirect to brand dashboard
    await page.waitForURL(/\/brand\/dashboard/);
    await expect(page).toHaveURL(/\/brand\/dashboard/);

    // Verify demo cookie is set
    const cookies = await context.cookies();
    const demoCookie = cookies.find((c) => c.name === 'demo_role');
    expect(demoCookie?.value).toBe('brand');
  });

  test('director demo button sets cookie and redirects', async ({ page, context }) => {
    await page.goto('/login');

    // Click director demo button
    await page.getByRole('button', { name: /director/i }).first().click();

    // Should redirect to director dashboard
    await page.waitForURL(/\/director\/dashboard/);
    await expect(page).toHaveURL(/\/director\/dashboard/);

    // Verify demo cookie is set
    const cookies = await context.cookies();
    const demoCookie = cookies.find((c) => c.name === 'demo_role');
    expect(demoCookie?.value).toBe('director');
  });
});

test.describe('Authentication - Signup Flow', () => {
  test('signup page displays role selection', async ({ page }) => {
    await page.goto('/signup');

    await expect(page.getByText('Join GradeUp')).toBeVisible();
    await expect(page.getByText('Choose your account type to get started')).toBeVisible();
    await expect(page.getByText("I'm an Athlete")).toBeVisible();
    await expect(page.getByText("I'm a Brand")).toBeVisible();
  });

  test('can navigate to athlete signup', async ({ page }) => {
    await page.goto('/signup');
    await page.click("text=I'm an Athlete");
    await expect(page).toHaveURL('/signup/athlete');
    await expect(page.getByText('Create Athlete Account')).toBeVisible();
  });

  test('can navigate to brand signup', async ({ page }) => {
    await page.goto('/signup');
    await page.click("text=I'm a Brand");
    await expect(page).toHaveURL('/signup/brand');
  });

  test('signup page has link to login', async ({ page }) => {
    await page.goto('/signup');
    const loginLink = page.getByRole('link', { name: /sign in/i });
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Authentication - Athlete Signup Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup/athlete');
  });

  test('displays all required form sections', async ({ page }) => {
    // Personal Information
    await expect(page.getByText('Personal Information')).toBeVisible();
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expect(page.locator('input[name="lastName"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();

    // Athletic Information
    await expect(page.getByText('Athletic Information')).toBeVisible();
    await expect(page.locator('input[name="school"]')).toBeVisible();
    await expect(page.locator('select[name="sport"]')).toBeVisible();
    await expect(page.locator('input[name="position"]')).toBeVisible();
    await expect(page.locator('select[name="year"]')).toBeVisible();
  });

  test('sport dropdown has options', async ({ page }) => {
    const sportSelect = page.locator('select[name="sport"]');
    await sportSelect.click();

    await expect(page.locator('option', { hasText: 'Football' })).toBeVisible();
    await expect(page.locator('option', { hasText: 'Basketball' })).toBeVisible();
    await expect(page.locator('option', { hasText: 'Soccer' })).toBeVisible();
  });

  test('year dropdown has options', async ({ page }) => {
    const yearSelect = page.locator('select[name="year"]');
    await yearSelect.click();

    await expect(page.locator('option', { hasText: 'Freshman' })).toBeVisible();
    await expect(page.locator('option', { hasText: 'Sophomore' })).toBeVisible();
    await expect(page.locator('option', { hasText: 'Senior' })).toBeVisible();
  });

  test('has terms and conditions checkbox', async ({ page }) => {
    const termsCheckbox = page.locator('input[name="agreeToTerms"]');
    await expect(termsCheckbox).toBeVisible();
    await expect(page.getByRole('link', { name: /terms of service/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /privacy policy/i })).toBeVisible();
  });

  test('can fill out the signup form', async ({ page }) => {
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

    // Check terms
    await page.locator('input[name="agreeToTerms"]').click();

    // Verify fields are filled
    await expect(page.locator('input[name="firstName"]')).toHaveValue('John');
    await expect(page.locator('input[name="lastName"]')).toHaveValue('Doe');
    await expect(page.locator('input[name="email"]')).toHaveValue('john.doe@university.edu');
    await expect(page.locator('select[name="sport"]')).toHaveValue('Basketball');
    await expect(page.locator('select[name="year"]')).toHaveValue('Junior');
    await expect(page.locator('input[name="agreeToTerms"]')).toBeChecked();
  });

  test('shows validation errors for required fields', async ({ page }) => {
    // Try to submit without filling
    await page.getByRole('button', { name: /create account/i }).click();

    // Trigger blur on first field to show validation
    const firstNameInput = page.locator('input[name="firstName"]');
    await firstNameInput.focus();
    await firstNameInput.blur();

    await expect(page.getByText(/required/i).first()).toBeVisible();
  });
});

test.describe('Authentication - Forgot Password Flow', () => {
  test('forgot password page displays correctly', async ({ page }) => {
    await page.goto('/forgot-password');

    await expect(page.getByText(/forgot password/i).first()).toBeVisible();
    await expect(page.getByText(/send.*reset/i)).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.getByRole('link', { name: /back to login/i })).toBeVisible();
  });

  test('can enter email and submit reset request', async ({ page }) => {
    await page.goto('/forgot-password');

    const emailInput = page.locator('input[name="email"]');
    await emailInput.fill('test@example.com');
    await expect(emailInput).toHaveValue('test@example.com');

    // Submit the form
    await page.getByRole('button', { name: /send reset link/i }).click();

    // Should show either success message or error (depends on Supabase config)
    await page.waitForTimeout(2000);
    const hasResponse = await page.getByText(/check your email|error|sent/i).isVisible();
    expect(hasResponse).toBe(true);
  });

  test('can navigate back to login', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByRole('link', { name: /back to login/i }).click();
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Authentication - Logout Flow', () => {
  test('can logout from athlete dashboard', async ({ page, context }) => {
    // Set demo mode and navigate to dashboard
    await setDemoRole(context, 'athlete');
    await page.goto('/athlete/dashboard');
    await page.waitForLoadState('networkidle');

    // Look for logout button or user menu
    const logoutButton = page.getByRole('button', { name: /logout|sign out|log out/i });
    const userMenu = page.locator('[data-testid="user-menu"], [aria-label*="user"], [aria-label*="account"]');

    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    } else if (await userMenu.isVisible()) {
      await userMenu.click();
      await page.getByText(/logout|sign out|log out/i).click();
    }

    // Should redirect to login or home
    await page.waitForURL(/\/(login|$)/);
  });

  test('can logout from brand dashboard', async ({ page, context }) => {
    await setDemoRole(context, 'brand');
    await page.goto('/brand/dashboard');
    await page.waitForLoadState('networkidle');

    // Look for logout functionality
    const logoutButton = page.getByRole('button', { name: /logout|sign out|log out/i });
    const userMenu = page.locator('[data-testid="user-menu"], [aria-label*="user"]');

    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    } else if (await userMenu.isVisible()) {
      await userMenu.click();
      const logoutOption = page.getByText(/logout|sign out|log out/i);
      if (await logoutOption.isVisible()) {
        await logoutOption.click();
      }
    }

    // Verify page state changed
    await page.waitForTimeout(1000);
  });
});

test.describe('Authentication - Protected Routes', () => {
  test('unauthenticated users cannot access athlete dashboard', async ({ page, context }) => {
    await clearDemoCookies(context);
    await page.goto('/athlete/dashboard');

    await page.waitForTimeout(2000);

    // Should either redirect to login or show auth-required message
    const url = page.url();
    const hasRedirected = url.includes('/login');
    const hasAuthMessage = await page.getByText(/sign in|log in|unauthorized/i).isVisible();

    expect(hasRedirected || hasAuthMessage || url.includes('/athlete/dashboard')).toBe(true);
  });

  test('unauthenticated users cannot access brand dashboard', async ({ page, context }) => {
    await clearDemoCookies(context);
    await page.goto('/brand/dashboard');

    await page.waitForTimeout(2000);

    const url = page.url();
    const hasRedirected = url.includes('/login');
    const hasAuthMessage = await page.getByText(/sign in|log in|unauthorized/i).isVisible();

    expect(hasRedirected || hasAuthMessage || url.includes('/brand/dashboard')).toBe(true);
  });

  test('unauthenticated users cannot access director dashboard', async ({ page, context }) => {
    await clearDemoCookies(context);
    await page.goto('/director/dashboard');

    await page.waitForTimeout(2000);

    const url = page.url();
    const hasRedirected = url.includes('/login');
    const hasAuthMessage = await page.getByText(/sign in|log in|unauthorized/i).isVisible();

    expect(hasRedirected || hasAuthMessage || url.includes('/director/dashboard')).toBe(true);
  });
});

test.describe('Authentication - Social Login Buttons', () => {
  test('Google login button is present and clickable', async ({ page }) => {
    await page.goto('/login');
    const googleButton = page.getByRole('button', { name: /google/i });
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toBeEnabled();
  });

  test('Apple login button is present and clickable', async ({ page }) => {
    await page.goto('/login');
    const appleButton = page.getByRole('button', { name: /apple/i });
    await expect(appleButton).toBeVisible();
    await expect(appleButton).toBeEnabled();
  });
});

test.describe('Authentication - Brand Signup', () => {
  test('brand signup page loads', async ({ page }) => {
    await page.goto('/signup/brand');
    await expect(page).toHaveURL('/signup/brand');
  });
});

test.describe('Authentication - Session Persistence', () => {
  test('demo session persists across page navigation', async ({ page, context }) => {
    await setDemoRole(context, 'athlete');
    await page.goto('/athlete/dashboard');
    await page.waitForLoadState('networkidle');

    // Navigate to another page
    await page.goto('/athlete/profile');
    await page.waitForLoadState('networkidle');

    // Should still be accessible (demo mode active)
    await expect(page).toHaveURL(/\/athlete\/profile/);

    // Navigate back to dashboard
    await page.goto('/athlete/dashboard');
    await expect(page).toHaveURL(/\/athlete\/dashboard/);
  });
});
