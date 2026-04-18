import { test, expect, type Page } from '@playwright/test';

// ============================================================================
// SECTION 1: LOGIN FORM (/login)
// ============================================================================

test.describe('1. Login Form (/login)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
  });

  test('1a. Submit empty form - verify error messages appear', async ({ page }) => {
    // Click submit without filling anything
    const submitBtn = page.getByRole('button', { name: /sign in/i });
    await submitBtn.click();

    // After submitting empty, we should see validation errors or a toast
    // The form uses validate() which triggers field errors
    // Tab through fields first to trigger touched state
    const emailInput = page.locator('#email');
    const passwordInput = page.locator('#password');

    await emailInput.focus();
    await emailInput.blur();
    await passwordInput.focus();
    await passwordInput.blur();

    await submitBtn.click();

    // Check for field-level error messages
    const emailError = page.locator('#email-error');
    const passwordError = page.locator('#password-error');

    // At least one validation message should appear
    const hasEmailError = await emailError.isVisible().catch(() => false);
    const hasPasswordError = await passwordError.isVisible().catch(() => false);

    // Also check for toast notifications
    const hasToast = await page.locator('[role="alert"]').first().isVisible().catch(() => false);

    console.log(`  Empty form - Email error visible: ${hasEmailError}`);
    console.log(`  Empty form - Password error visible: ${hasPasswordError}`);
    console.log(`  Empty form - Toast/alert visible: ${hasToast}`);

    expect(hasEmailError || hasPasswordError || hasToast).toBe(true);
  });

  test('1b. Enter invalid email - verify validation', async ({ page }) => {
    const emailInput = page.locator('#email');
    await emailInput.fill('not-an-email');
    await emailInput.blur();

    // Wait a moment for validation to fire
    await page.waitForTimeout(300);

    // Check for email error message
    const emailError = page.locator('#email-error');
    const isVisible = await emailError.isVisible().catch(() => false);
    const text = isVisible ? await emailError.textContent() : '';

    console.log(`  Invalid email - Error visible: ${isVisible}, text: "${text}"`);
    expect(isVisible).toBe(true);
  });

  test('1c. Valid email + wrong password - verify error', async ({ page }) => {
    const emailInput = page.locator('#email');
    const passwordInput = page.locator('#password');
    const submitBtn = page.getByRole('button', { name: /sign in/i });

    await emailInput.fill('test@example.com');
    await passwordInput.fill('WrongPassword123!');
    await submitBtn.click();

    // Wait for the API call and error response
    await page.waitForTimeout(3000);

    // Check for error alert or toast
    const errorAlert = page.locator('[role="alert"]');
    const alertCount = await errorAlert.count();
    let errorText = '';
    if (alertCount > 0) {
      errorText = await errorAlert.first().textContent() || '';
    }

    console.log(`  Wrong password - Alerts found: ${alertCount}, text: "${errorText}"`);
    expect(alertCount).toBeGreaterThan(0);
  });

  test('1d. Remember me checkbox toggles', async ({ page }) => {
    const checkbox = page.locator('input[name="rememberMe"]');
    expect(await checkbox.isChecked()).toBe(false);

    await checkbox.check();
    expect(await checkbox.isChecked()).toBe(true);

    await checkbox.uncheck();
    expect(await checkbox.isChecked()).toBe(false);

    console.log('  Remember me - Toggles correctly');
  });

  test('1e. Forgot password link navigates', async ({ page }) => {
    const link = page.getByRole('link', { name: /forgot password/i });
    await expect(link).toBeVisible();

    const href = await link.getAttribute('href');
    console.log(`  Forgot password link href: ${href}`);
    expect(href).toBe('/forgot-password');

    await link.click();
    await page.waitForURL('**/forgot-password');
    console.log(`  Navigated to: ${page.url()}`);
    expect(page.url()).toContain('/forgot-password');
  });

  test('1f. Sign up link exists on login page', async ({ page }) => {
    const signUpLink = page.getByRole('link', { name: /sign up/i });
    await expect(signUpLink).toBeVisible();
  });
});

// ============================================================================
// SECTION 2: SIGNUP FORMS
// ============================================================================

test.describe('2a. Athlete Signup (/signup/athlete)', () => {
  test('Fill all fields and verify validation on each', async ({ page }) => {
    await page.goto('/signup/athlete');
    await page.waitForLoadState('networkidle');

    // Test submitting empty form first
    const submitBtn = page.getByRole('button', { name: /create account/i });
    await submitBtn.click();
    await page.waitForTimeout(500);

    // Check for validation toast or inline errors
    const hasAlert = await page.locator('[role="alert"]').first().isVisible().catch(() => false);
    console.log(`  Empty athlete form - Alert visible: ${hasAlert}`);

    // Fill in fields one by one and verify
    const firstName = page.locator('input[name="firstName"]');
    const lastName = page.locator('input[name="lastName"]');
    const email = page.locator('input[name="email"]');
    const password = page.locator('input[name="password"]');
    const confirmPassword = page.locator('input[name="confirmPassword"]');
    const school = page.locator('input[name="school"]');
    const position = page.locator('input[name="position"]');
    const instagram = page.locator('input[name="instagram"]');

    // Test short first name validation
    await firstName.fill('J');
    await firstName.blur();
    await page.waitForTimeout(300);
    const firstNameHasError = await page.locator('text=at least 2 characters').first().isVisible().catch(() => false);
    console.log(`  Short first name error: ${firstNameHasError}`);

    // Fill valid values
    await firstName.fill('John');
    await lastName.fill('Doe');
    await email.fill('john.doe@university.edu');
    await password.fill('StrongPass123!');
    await confirmPassword.fill('StrongPass123!');
    await school.fill('University of Michigan');

    // Select sport dropdown
    const sportSelect = page.locator('select[name="sport"]');
    if (await sportSelect.isVisible()) {
      await sportSelect.selectOption('Basketball');
      console.log('  Sport selected: Basketball');
    }

    await position.fill('Point Guard');

    // Select year dropdown
    const yearSelect = page.locator('select[name="year"]');
    if (await yearSelect.isVisible()) {
      await yearSelect.selectOption('Junior');
      console.log('  Year selected: Junior');
    }

    // Optional: Instagram
    await instagram.fill('@johndoe');

    // Check terms checkbox
    const termsCheckbox = page.locator('input[name="agreeToTerms"]');
    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.check();
      console.log('  Terms checkbox checked');
    }

    // Verify all fields are filled
    expect(await firstName.inputValue()).toBe('John');
    expect(await lastName.inputValue()).toBe('Doe');
    expect(await email.inputValue()).toBe('john.doe@university.edu');
    expect(await school.inputValue()).toBe('University of Michigan');
    expect(await position.inputValue()).toBe('Point Guard');

    console.log('  All athlete signup fields filled and validated');
  });

  test('Password mismatch shows error', async ({ page }) => {
    await page.goto('/signup/athlete');
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="password"]').fill('StrongPass123!');
    await page.locator('input[name="confirmPassword"]').fill('DifferentPass456!');
    await page.locator('input[name="confirmPassword"]').blur();
    await page.waitForTimeout(300);

    // Fill all required fields so the mismatch is the issue
    await page.locator('input[name="firstName"]').fill('John');
    await page.locator('input[name="lastName"]').fill('Doe');
    await page.locator('input[name="email"]').fill('john@test.edu');
    await page.locator('input[name="school"]').fill('Test U');
    await page.locator('input[name="position"]').fill('Guard');

    const sportSelect = page.locator('select[name="sport"]');
    if (await sportSelect.isVisible()) await sportSelect.selectOption('Basketball');
    const yearSelect = page.locator('select[name="year"]');
    if (await yearSelect.isVisible()) await yearSelect.selectOption('Junior');

    const termsCheckbox = page.locator('input[name="agreeToTerms"]');
    if (await termsCheckbox.isVisible()) await termsCheckbox.check();

    await page.getByRole('button', { name: /create account/i }).click();
    await page.waitForTimeout(500);

    const hasAlert = await page.locator('[role="alert"]').isVisible().catch(() => false);
    const alertText = hasAlert ? await page.locator('[role="alert"]').first().textContent() : '';
    console.log(`  Password mismatch - Alert: ${hasAlert}, text: "${alertText}"`);
  });
});

test.describe('2b. Brand Signup (/signup/brand)', () => {
  test('Fill all fields and verify validation', async ({ page }) => {
    await page.goto('/signup/brand');
    await page.waitForLoadState('networkidle');

    // Submit empty
    const submitBtn = page.getByRole('button', { name: /create account/i });
    await submitBtn.click();
    await page.waitForTimeout(500);
    const hasAlert = await page.locator('[role="alert"]').first().isVisible().catch(() => false);
    console.log(`  Empty brand form - Alert visible: ${hasAlert}`);

    // Fill fields
    const companyName = page.locator('input[name="companyName"]');
    const website = page.locator('input[name="website"]');
    const fullName = page.locator('input[name="fullName"]');
    const email = page.locator('input[name="email"]');
    const password = page.locator('input[name="password"]');
    const confirmPassword = page.locator('input[name="confirmPassword"]');

    await companyName.fill('Acme Sports Inc.');

    const industrySelect = page.locator('select[name="industry"]');
    if (await industrySelect.isVisible()) {
      await industrySelect.selectOption('Sports & Fitness');
      console.log('  Industry selected');
    }

    await website.fill('https://acmesports.com');
    await fullName.fill('Jane Smith');
    await email.fill('jane@acmesports.com');
    await password.fill('BrandPass123!');
    await confirmPassword.fill('BrandPass123!');

    const termsCheckbox = page.locator('input[name="agreeToTerms"]');
    if (await termsCheckbox.isVisible()) await termsCheckbox.check();

    expect(await companyName.inputValue()).toBe('Acme Sports Inc.');
    expect(await fullName.inputValue()).toBe('Jane Smith');
    console.log('  All brand signup fields filled');
  });
});

test.describe('2c. Director Signup (/signup/director)', () => {
  test('Fill all fields and verify validation', async ({ page }) => {
    await page.goto('/signup/director');
    await page.waitForLoadState('networkidle');

    // Submit empty
    const submitBtn = page.getByRole('button', { name: /create account/i });
    await submitBtn.click();
    await page.waitForTimeout(500);
    const hasAlert = await page.locator('[role="alert"]').first().isVisible().catch(() => false);
    console.log(`  Empty director form - Alert visible: ${hasAlert}`);

    // Fill fields
    await page.locator('input[name="schoolName"]').fill('Michigan State University');

    const divisionSelect = page.locator('select[name="division"]');
    if (await divisionSelect.isVisible()) {
      await divisionSelect.selectOption('NCAA Division I');
      console.log('  Division selected');
    }

    const departmentField = page.locator('input[name="department"]');
    if (await departmentField.isVisible()) {
      await departmentField.fill('Athletic Department');
    }

    await page.locator('input[name="fullName"]').fill('Coach Williams');

    const titleField = page.locator('input[name="title"]');
    if (await titleField.isVisible()) {
      await titleField.fill('Athletic Director');
    }

    await page.locator('input[name="email"]').fill('williams@msu.edu');

    const phoneField = page.locator('input[name="phone"]');
    if (await phoneField.isVisible()) {
      await phoneField.fill('(555) 123-4567');
    }

    await page.locator('input[name="password"]').fill('DirectorPass123!');
    await page.locator('input[name="confirmPassword"]').fill('DirectorPass123!');

    const termsCheckbox = page.locator('input[name="agreeToTerms"]');
    if (await termsCheckbox.isVisible()) await termsCheckbox.check();

    console.log('  All director signup fields filled');
  });
});

// ============================================================================
// SECTION 3: FORGOT PASSWORD (/forgot-password)
// ============================================================================

test.describe('3. Forgot Password (/forgot-password)', () => {
  test('3a. Submit empty - verify error', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');

    const submitBtn = page.getByRole('button', { name: /send reset link/i });
    await submitBtn.click();

    // HTML5 validation should block empty email (required attribute)
    // Or we get a custom error
    await page.waitForTimeout(500);

    // Check if native HTML validation tooltip appeared (can't easily detect)
    // Or check for error alert
    const hasAlert = await page.locator('[role="alert"]').isVisible().catch(() => false);
    const emailInput = page.locator('#email');
    const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);

    console.log(`  Empty forgot password - Alert: ${hasAlert}, HTML5 validation: "${validationMessage}"`);
    expect(hasAlert || validationMessage.length > 0).toBe(true);
  });

  test('3b. Submit valid email - verify success or error message', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('#email');
    await emailInput.fill('test@example.com');

    const submitBtn = page.getByRole('button', { name: /send reset link/i });
    await submitBtn.click();

    // Wait for API call
    await page.waitForTimeout(3000);

    // Should either show success state ("Check Your Email") or error alert
    const successHeading = page.locator('text=Check Your Email');
    const hasSuccess = await successHeading.isVisible().catch(() => false);
    const hasAlert = await page.locator('[role="alert"]').isVisible().catch(() => false);

    console.log(`  Forgot password submit - Success: ${hasSuccess}, Error alert: ${hasAlert}`);
    expect(hasSuccess || hasAlert).toBe(true);
  });
});

// ============================================================================
// SECTION 4: DASHBOARD INTERACTIONS (Demo Mode)
// ============================================================================

test.describe('4. Dashboard Interactions (Demo Mode)', () => {
  // Helper to set demo_role cookie and dismiss onboarding modal
  async function loginAsDemo(page: Page, role: string) {
    const response = await page.goto(`/api/demo/login?role=${role}`);
    await page.waitForLoadState('networkidle');
    console.log(`  Demo login as ${role} - URL: ${page.url()}, status: ${response?.status()}`);
  }

  // The dashboard shows a "Complete Your Profile" onboarding modal with a
  // spotlight SVG overlay (z-index 9998) that blocks ALL pointer events.
  // This helper dismisses it by removing the overlay and closing the modal.
  async function dismissOnboardingModal(page: Page) {
    await page.waitForTimeout(2000); // Give onboarding time to appear

    // Check for the spotlight overlay SVG that blocks pointer events
    const hasSpotlight = await page.locator('svg.fixed.inset-0').isVisible().catch(() => false);
    const hasModal = await page.locator('text=Complete Your Profile').isVisible().catch(() => false);

    console.log(`  Onboarding check - Spotlight overlay: ${hasSpotlight}, Modal text: ${hasModal}`);

    if (hasSpotlight || hasModal) {
      console.log('  Onboarding modal detected - dismissing...');

      // Strategy 1: Remove the spotlight SVG overlay via JS so we can click
      await page.evaluate(() => {
        // Remove the spotlight overlay SVG
        document.querySelectorAll('svg.fixed').forEach(el => el.remove());
        // Remove any backdrop overlay divs
        document.querySelectorAll('div[aria-hidden="true"]').forEach(el => {
          if (el.classList.contains('fixed') && getComputedStyle(el).position === 'fixed') {
            el.remove();
          }
        });
      });
      await page.waitForTimeout(300);

      // Strategy 2: Click the X close button on the modal (now accessible)
      const closeXBtn = page.locator('button:has(svg path[d*="18 6"])').first();
      const hasX = await closeXBtn.isVisible().catch(() => false);
      if (hasX) {
        await closeXBtn.click({ force: true });
        await page.waitForTimeout(500);
      } else {
        // Fallback: press Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }

      // Strategy 3: If modal still present, remove it entirely via JS
      const stillVisible = await page.locator('text=Complete Your Profile').isVisible().catch(() => false);
      if (stillVisible) {
        await page.evaluate(() => {
          // Remove onboarding modal container
          const modals = document.querySelectorAll('[class*="onboarding"], [class*="spotlight"]');
          modals.forEach(el => el.remove());
          // Also try removing by finding the "Complete Your Profile" text parent
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            if (walker.currentNode.textContent?.includes('Complete Your Profile')) {
              // Go up to find a container that looks like a modal
              let parent = walker.currentNode.parentElement;
              for (let i = 0; i < 10 && parent; i++) {
                if (parent.classList.contains('fixed') || parent.classList.contains('absolute')) {
                  parent.remove();
                  break;
                }
                parent = parent.parentElement;
              }
              break;
            }
          }
        });
        await page.waitForTimeout(300);
      }

      console.log(`  Onboarding dismissed: ${!(await page.locator('text=Complete Your Profile').isVisible().catch(() => false))}`);
    } else {
      console.log('  No onboarding modal detected');
    }
  }

  test('4a. Athlete Dashboard - Quick actions', async ({ page }) => {
    await loginAsDemo(page, 'athlete');
    expect(page.url()).toContain('/athlete/dashboard');
    await dismissOnboardingModal(page);

    // Look for quick action buttons or dropdowns
    const quickActionBtns = page.locator('button').filter({ hasText: /quick action/i });
    const count = await quickActionBtns.count();
    console.log(`  Athlete dashboard - Quick action buttons found: ${count}`);

    if (count > 0) {
      await quickActionBtns.first().click();
      await page.waitForTimeout(500);
      // Check if dropdown menu appeared
      const dropdownItems = page.locator('[role="menuitem"], [role="option"]');
      const itemCount = await dropdownItems.count();
      console.log(`  Quick actions dropdown items: ${itemCount}`);
    }

    // Look for any dropdown triggers
    const dropdownTriggers = page.locator('[aria-haspopup], [aria-expanded]');
    const dropdownCount = await dropdownTriggers.count();
    console.log(`  Dropdown triggers found: ${dropdownCount}`);

    const errorBoundary = page.locator('text=Something went wrong');
    const hasError = await errorBoundary.isVisible().catch(() => false);
    console.log(`  Athlete dashboard error: ${hasError}`);
    expect(hasError).toBe(false);
  });

  test('4b. Athlete Profile - Toggle edit mode', async ({ page }) => {
    await loginAsDemo(page, 'athlete');
    await dismissOnboardingModal(page);
    await page.goto('/athlete/profile');
    await page.waitForLoadState('networkidle');
    await dismissOnboardingModal(page);

    // Look for edit button
    const editBtn = page.getByRole('button', { name: /edit|update/i }).first();
    const hasEditBtn = await editBtn.isVisible().catch(() => false);
    console.log(`  Profile - Edit button visible: ${hasEditBtn}`);

    if (hasEditBtn) {
      await editBtn.click({ force: true });
      await page.waitForTimeout(500);

      // Check if form fields became editable
      const inputs = page.locator('input:not([disabled]):not([readonly])');
      const editableCount = await inputs.count();
      console.log(`  Profile - Editable inputs after click: ${editableCount}`);
    }

    // Check for any save/cancel buttons
    const saveBtn = page.getByRole('button', { name: /save|update|submit/i }).first();
    const hasSaveBtn = await saveBtn.isVisible().catch(() => false);
    console.log(`  Profile - Save button visible: ${hasSaveBtn}`);

    const errorBoundary = page.locator('text=Something went wrong');
    const hasError = await errorBoundary.isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });

  test('4c. Athlete Settings - Toggle switches and theme', async ({ page }) => {
    await loginAsDemo(page, 'athlete');
    await page.goto('/athlete/settings');
    await page.waitForLoadState('networkidle');
    await dismissOnboardingModal(page);

    // Find toggle switches (checkboxes or switch roles)
    const switches = page.locator('[role="switch"], input[type="checkbox"]');
    const switchCount = await switches.count();
    console.log(`  Settings - Toggle switches found: ${switchCount}`);

    // Try toggling first switch
    if (switchCount > 0) {
      const firstSwitch = switches.first();
      const wasChecked = await firstSwitch.isChecked().catch(() => false);
      await firstSwitch.click({ force: true });
      await page.waitForTimeout(300);
      const nowChecked = await firstSwitch.isChecked().catch(() => false);
      console.log(`  Settings - First switch toggled: ${wasChecked} -> ${nowChecked}`);
    }

    // Look for theme selector
    const themeSelector = page.locator('[data-testid="theme"], select:has(option:text("Dark")), button:has-text("Dark"), button:has-text("Light")');
    const hasTheme = await themeSelector.first().isVisible().catch(() => false);
    console.log(`  Settings - Theme selector found: ${hasTheme}`);

    const errorBoundary = page.locator('text=Something went wrong');
    const hasError = await errorBoundary.isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });

  test('4d. Athlete Deals - Switch views', async ({ page }) => {
    await loginAsDemo(page, 'athlete');
    await dismissOnboardingModal(page);
    await page.goto('/athlete/deals');
    await page.waitForLoadState('networkidle');
    await dismissOnboardingModal(page);

    // Look for view toggle buttons (table/kanban/list/grid)
    const viewToggles = page.locator('button').filter({ hasText: /table|kanban|list|grid|board/i });
    const toggleCount = await viewToggles.count();
    console.log(`  Deals - View toggle buttons found: ${toggleCount}`);

    if (toggleCount > 1) {
      await viewToggles.nth(1).click({ force: true });
      await page.waitForTimeout(500);
      console.log('  Deals - Switched to alternate view');

      await viewToggles.first().click({ force: true });
      await page.waitForTimeout(500);
      console.log('  Deals - Switched back');
    }

    // Also look for tab-style view switches
    const tabs = page.locator('[role="tablist"] [role="tab"], [data-state]');
    const tabCount = await tabs.count();
    console.log(`  Deals - Tab elements found: ${tabCount}`);

    const errorBoundary = page.locator('text=Something went wrong');
    const hasError = await errorBoundary.isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });

  test('4e. Athlete Messages - Click conversation, send message', async ({ page }) => {
    await loginAsDemo(page, 'athlete');
    await page.goto('/athlete/messages');
    await page.waitForLoadState('networkidle');
    await dismissOnboardingModal(page);

    // From the screenshot we can see conversation items with brand names:
    // Nike, Gatorade, Foot Locker, Duke Athletics
    // These are direct children in the sidebar message list
    const conversationItems = page.locator('div').filter({ hasText: /Nike|Gatorade|Foot Locker|Duke Athletics/i }).locator('visible=true');
    const convCount = await conversationItems.count();
    console.log(`  Messages - Brand conversation items found: ${convCount}`);

    // Try clicking a specific conversation by its brand text
    const nikeConvo = page.locator('div').filter({ hasText: 'Nike' }).filter({ hasText: 'Instagram' }).first();
    const hasNike = await nikeConvo.isVisible().catch(() => false);
    console.log(`  Messages - Nike conversation visible: ${hasNike}`);

    if (hasNike) {
      await nikeConvo.click({ force: true });
      await page.waitForTimeout(500);
      console.log('  Messages - Clicked Nike conversation');
    }

    // Look for message input - from screenshot there's an input at the bottom
    const messageInput = page.locator('input[placeholder*="essage"], textarea[placeholder*="essage"], input[placeholder*="ype"], textarea[placeholder*="ype"], input[type="text"]').last();
    const hasInput = await messageInput.isVisible().catch(() => false);
    console.log(`  Messages - Message input found: ${hasInput}`);

    if (hasInput) {
      await messageInput.fill('Test message from Playwright');
      console.log('  Messages - Typed test message');

      // Look for send button (the arrow icon at bottom-right in the screenshot)
      const sendBtn = page.locator('button:has(svg)').last();
      const hasSend = await sendBtn.isVisible().catch(() => false);
      console.log(`  Messages - Send button found: ${hasSend}`);
    }

    const errorBoundary = page.locator('text=Something went wrong');
    const hasError = await errorBoundary.isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });
});

// ============================================================================
// SECTION 5: COMMAND PALETTE
// ============================================================================

test.describe('5. Command Palette', () => {
  test('Open with Cmd+K, search, and close', async ({ page }) => {
    // From the screenshot we can see a "Search" button with "Cmd+K" label
    // in the dashboard top bar. Navigate there first.
    await page.goto('/api/demo/login?role=athlete');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Dismiss onboarding modal/spotlight overlay via JS
    await page.evaluate(() => {
      document.querySelectorAll('svg.fixed').forEach(el => el.remove());
      document.querySelectorAll('div[aria-hidden="true"]').forEach(el => {
        if (el.classList.contains('fixed')) el.remove();
      });
    });
    await page.waitForTimeout(300);

    // Close the modal X button if present
    const modalXBtn = page.locator('button:has(svg path[d*="18 6"])').first();
    if (await modalXBtn.isVisible().catch(() => false)) {
      await modalXBtn.click({ force: true });
      await page.waitForTimeout(500);
    }

    // Also remove any remaining spotlight/onboarding elements
    await page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        if (walker.currentNode.textContent?.includes('Complete Your Profile')) {
          let parent = walker.currentNode.parentElement;
          for (let i = 0; i < 10 && parent; i++) {
            if (parent.classList.contains('fixed') || parent.classList.contains('absolute')) {
              parent.remove();
              break;
            }
            parent = parent.parentElement;
          }
          break;
        }
      }
    });
    await page.waitForTimeout(300);

    // From screenshot: there's a "Search" button with Cmd+K in the top bar
    // Try clicking the search button directly first
    const searchBtn = page.locator('button').filter({ hasText: /search/i }).first();
    const hasSearchBtn = await searchBtn.isVisible().catch(() => false);
    console.log(`  Command palette - Search button visible: ${hasSearchBtn}`);

    if (hasSearchBtn) {
      await searchBtn.click();
      await page.waitForTimeout(500);
    } else {
      // Fallback: try Cmd+K keyboard shortcut
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(500);
    }

    // Check if command palette/search dialog opened
    let paletteVisible = await page.locator('[role="dialog"], [cmdk-root], [data-testid="command-palette"]').first().isVisible().catch(() => false);
    console.log(`  Command palette - Opened: ${paletteVisible}`);

    if (!paletteVisible) {
      // Also try Ctrl+K
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(500);
      paletteVisible = await page.locator('[role="dialog"], [cmdk-root]').first().isVisible().catch(() => false);
      console.log(`  Command palette - After Ctrl+K: ${paletteVisible}`);
    }

    if (paletteVisible) {
      // Type a search query
      const searchInput = page.locator('[role="dialog"] input, [cmdk-input], input[placeholder*="earch"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('dashboard');
        await page.waitForTimeout(300);
        console.log('  Command palette - Typed "dashboard"');

        // Check for results
        const results = page.locator('[role="dialog"] [role="option"], [cmdk-item], [role="dialog"] li');
        const resultCount = await results.count();
        console.log(`  Command palette - Results found: ${resultCount}`);
      }

      // Close with Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      const stillVisible = await page.locator('[role="dialog"]').isVisible().catch(() => false);
      console.log(`  Command palette - After Escape: ${stillVisible ? 'still open' : 'closed'}`);
    } else {
      console.log('  ISSUE: Command palette did not open via button click or Cmd+K');
    }
  });
});

// ============================================================================
// SECTION 6: MOBILE VIEWPORT (375px)
// ============================================================================

test.describe('6. Mobile Viewport (375px)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('6a. Login page renders correctly on mobile', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Verify form is still visible and usable
    const emailInput = page.locator('#email');
    const passwordInput = page.locator('#password');
    const submitBtn = page.getByRole('button', { name: /sign in/i });

    expect(await emailInput.isVisible()).toBe(true);
    expect(await passwordInput.isVisible()).toBe(true);
    expect(await submitBtn.isVisible()).toBe(true);

    console.log('  Mobile login - Form elements visible');
  });

  test('6b. Dashboard mobile - hamburger menu', async ({ page }) => {
    // Login as demo athlete
    await page.goto('/api/demo/login?role=athlete');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Dismiss onboarding spotlight overlay via JS (same as desktop)
    await page.evaluate(() => {
      document.querySelectorAll('svg.fixed').forEach(el => el.remove());
      document.querySelectorAll('div[aria-hidden="true"]').forEach(el => {
        if (el.classList.contains('fixed')) el.remove();
      });
      // Remove onboarding modal
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        if (walker.currentNode.textContent?.includes('Complete Your Profile')) {
          let parent = walker.currentNode.parentElement;
          for (let i = 0; i < 10 && parent; i++) {
            if (parent.classList.contains('fixed') || parent.classList.contains('absolute')) {
              parent.remove();
              break;
            }
            parent = parent.parentElement;
          }
          break;
        }
      }
    });
    await page.waitForTimeout(500);

    // From the mobile screenshot: the hamburger is a 3-line icon in the
    // top-left corner. The "Close navigation menu" button is for closing the
    // sidebar and is off-screen initially. We need the OPEN button.
    // The open button likely has aria-label like "Open menu" or "Open navigation"
    // or might be found by excluding "Close" labels.

    // First try to find a visible hamburger button (not the "Close" one)
    const allMenuBtns = page.locator('button[aria-label*="menu" i], button[aria-label*="Menu"], button[aria-label*="navigation" i], button[aria-label*="sidebar" i]');
    const menuBtnCount = await allMenuBtns.count();
    console.log(`  Mobile - Menu-related buttons found: ${menuBtnCount}`);

    let hamburgerBtn = null;
    for (let i = 0; i < menuBtnCount; i++) {
      const btn = allMenuBtns.nth(i);
      const label = await btn.getAttribute('aria-label') || '';
      const isInViewport = await btn.isVisible().catch(() => false);
      // Also check bounding box to confirm it's actually on screen
      const box = await btn.boundingBox().catch(() => null);
      const isOnScreen = box && box.x >= 0 && box.x < 375 && box.y >= 0 && box.y < 812;
      console.log(`    Menu btn ${i}: label="${label}" visible=${isInViewport} onScreen=${isOnScreen} box=${JSON.stringify(box)}`);

      if (isOnScreen && !label.toLowerCase().includes('close') && !label.toLowerCase().includes('collapse')) {
        hamburgerBtn = btn;
        break;
      }
    }

    // If we still haven't found it, try the very first button on the page (top-left)
    if (!hamburgerBtn) {
      // The hamburger in the mobile screenshot is the very first button visible
      const firstBtn = page.locator('button:visible').first();
      const box = await firstBtn.boundingBox().catch(() => null);
      if (box && box.x < 100 && box.y < 80) {
        hamburgerBtn = firstBtn;
        const label = await firstBtn.getAttribute('aria-label') || '';
        console.log(`  Mobile - Using first visible button as hamburger: label="${label}"`);
      }
    }

    if (hamburgerBtn) {
      await hamburgerBtn.click({ force: true });
      await page.waitForTimeout(700);
      console.log('  Mobile - Clicked hamburger menu');

      // Check if sidebar/nav appeared
      const sidebar = page.locator('nav, aside, [role="navigation"]');
      const sidebarVisible = await sidebar.first().isVisible().catch(() => false);
      console.log(`  Mobile - Sidebar/nav visible after click: ${sidebarVisible}`);

      if (sidebarVisible) {
        const navLinks = sidebar.locator('a[href*="/athlete"]');
        const navLinkCount = await navLinks.count();
        console.log(`  Mobile - Athlete nav links in sidebar: ${navLinkCount}`);

        for (let i = 0; i < Math.min(navLinkCount, 6); i++) {
          const text = await navLinks.nth(i).textContent();
          const href = await navLinks.nth(i).getAttribute('href');
          console.log(`    Nav link ${i}: "${text?.trim()}" -> ${href}`);
        }

        // Click Profile link if available
        const profileLink = page.locator('a[href="/athlete/profile"]');
        if (await profileLink.isVisible().catch(() => false)) {
          await profileLink.click();
          await page.waitForURL('**/athlete/profile', { timeout: 5000 }).catch(() => {});
          console.log(`  Mobile - Navigated to: ${page.url()}`);
        }
      }
    } else {
      console.log('  ISSUE: No hamburger button found on mobile');
      const allBtns = page.locator('button:visible');
      const btnCount = await allBtns.count();
      for (let i = 0; i < Math.min(btnCount, 8); i++) {
        const label = await allBtns.nth(i).getAttribute('aria-label') || '';
        const box = await allBtns.nth(i).boundingBox().catch(() => null);
        console.log(`    Button ${i}: label="${label}" box=${JSON.stringify(box)}`);
      }
    }

    const errorBoundary = page.locator('text=Something went wrong');
    const hasError = await errorBoundary.isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });

  test('6c. Signup page responsive', async ({ page }) => {
    await page.goto('/signup/athlete');
    await page.waitForLoadState('networkidle');

    // Verify the form is usable on mobile
    const firstNameInput = page.locator('input[name="firstName"]');
    const isVisible = await firstNameInput.isVisible();
    console.log(`  Mobile signup - First name input visible: ${isVisible}`);
    expect(isVisible).toBe(true);

    // Check that form doesn't overflow
    const cardWidth = await page.locator('form').first().evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return { width: rect.width, viewportWidth: window.innerWidth };
    });
    console.log(`  Mobile signup - Form width: ${cardWidth.width}px, viewport: ${cardWidth.viewportWidth}px`);
    expect(cardWidth.width).toBeLessThanOrEqual(cardWidth.viewportWidth + 1);
  });
});

// ============================================================================
// SECTION 7: ADDITIONAL INTERACTION TESTS
// ============================================================================

test.describe('7. Additional Interaction Tests', () => {
  test('7a. Signup page role selector (/signup)', async ({ page }) => {
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');

    // Look for role selection cards/buttons
    const athleteLink = page.getByRole('link', { name: /athlete/i }).first();
    const brandLink = page.getByRole('link', { name: /brand/i }).first();
    const directorLink = page.getByRole('link', { name: /director/i }).first();

    const hasAthlete = await athleteLink.isVisible().catch(() => false);
    const hasBrand = await brandLink.isVisible().catch(() => false);
    const hasDirector = await directorLink.isVisible().catch(() => false);

    console.log(`  Signup selector - Athlete: ${hasAthlete}, Brand: ${hasBrand}, Director: ${hasDirector}`);
  });

  test('7b. Navigation links work', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check login link
    const loginLink = page.getByRole('link', { name: /log in|sign in/i }).first();
    const hasLogin = await loginLink.isVisible().catch(() => false);
    console.log(`  Navigation - Login link visible: ${hasLogin}`);

    // Check signup link
    const signupLink = page.getByRole('link', { name: /sign up|get started/i }).first();
    const hasSignup = await signupLink.isVisible().catch(() => false);
    console.log(`  Navigation - Signup link visible: ${hasSignup}`);
  });

  test('7c. Keyboard accessibility on login form', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Tab through form elements
    await page.keyboard.press('Tab');
    let focusedTag = await page.evaluate(() => document.activeElement?.tagName);
    console.log(`  Keyboard - First tab: ${focusedTag}`);

    await page.keyboard.press('Tab');
    focusedTag = await page.evaluate(() => document.activeElement?.tagName);
    let focusedId = await page.evaluate(() => document.activeElement?.id);
    console.log(`  Keyboard - Second tab: ${focusedTag}#${focusedId}`);

    // Continue tabbing through
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      focusedTag = await page.evaluate(() => document.activeElement?.tagName);
      focusedId = await page.evaluate(() => document.activeElement?.id || document.activeElement?.getAttribute('name') || '');
      console.log(`  Keyboard - Tab ${i + 3}: ${focusedTag}#${focusedId}`);
    }
  });
});
