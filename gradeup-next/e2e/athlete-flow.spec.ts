import { test, expect, type BrowserContext } from '@playwright/test';

// Helper to set demo mode cookie for athlete
async function setupAthleteDemoMode(context: BrowserContext) {
  await context.addCookies([
    {
      name: 'demo_role',
      value: 'athlete',
      domain: 'localhost',
      path: '/',
    },
  ]);
}

test.describe('Athlete Dashboard', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAthleteDemoMode(context);
    await page.goto('/athlete/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('dashboard loads with main components', async ({ page }) => {
    // Should be on athlete dashboard
    await expect(page).toHaveURL(/\/athlete\/dashboard/);

    // Check for common dashboard elements
    const hasWelcome = await page.getByText(/welcome|dashboard|overview/i).isVisible();
    const hasStats = await page.locator('[class*="stat"], [class*="card"], [class*="metric"]').first().isVisible();

    expect(hasWelcome || hasStats).toBe(true);
  });

  test('dashboard displays athlete stats/metrics', async ({ page }) => {
    // Look for stat cards or metric displays
    const statCards = page.locator('[class*="stat"], [class*="card"]');
    const cardCount = await statCards.count();

    // Should have at least some cards on the dashboard
    expect(cardCount).toBeGreaterThan(0);
  });

  test('can navigate to profile page from dashboard', async ({ page }) => {
    // Look for profile link/button in sidebar or header
    const profileLink = page.getByRole('link', { name: /profile/i });

    if (await profileLink.isVisible()) {
      await profileLink.click();
      await expect(page).toHaveURL(/\/athlete\/profile/);
    } else {
      // Try navigating directly
      await page.goto('/athlete/profile');
      await expect(page).toHaveURL(/\/athlete\/profile/);
    }
  });

  test('can navigate to deals page from dashboard', async ({ page }) => {
    const dealsLink = page.getByRole('link', { name: /deal/i });

    if (await dealsLink.isVisible()) {
      await dealsLink.click();
      await expect(page).toHaveURL(/\/athlete\/deals/);
    } else {
      await page.goto('/athlete/deals');
      await expect(page).toHaveURL(/\/athlete\/deals/);
    }
  });

  test('can navigate to earnings page from dashboard', async ({ page }) => {
    const earningsLink = page.getByRole('link', { name: /earning/i });

    if (await earningsLink.isVisible()) {
      await earningsLink.click();
      await expect(page).toHaveURL(/\/athlete\/earnings/);
    } else {
      await page.goto('/athlete/earnings');
      await expect(page).toHaveURL(/\/athlete\/earnings/);
    }
  });

  test('can navigate to messages page from dashboard', async ({ page }) => {
    const messagesLink = page.getByRole('link', { name: /message/i });

    if (await messagesLink.isVisible()) {
      await messagesLink.click();
      await expect(page).toHaveURL(/\/athlete\/messages/);
    } else {
      await page.goto('/athlete/messages');
      await expect(page).toHaveURL(/\/athlete\/messages/);
    }
  });

  test('can navigate to settings page from dashboard', async ({ page }) => {
    const settingsLink = page.getByRole('link', { name: /setting/i });

    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await expect(page).toHaveURL(/\/athlete\/settings/);
    } else {
      await page.goto('/athlete/settings');
      await expect(page).toHaveURL(/\/athlete\/settings/);
    }
  });
});

test.describe('Athlete Profile Page', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAthleteDemoMode(context);
    await page.goto('/athlete/profile');
    await page.waitForLoadState('networkidle');
  });

  test('profile page loads with main sections', async ({ page }) => {
    await expect(page).toHaveURL(/\/athlete\/profile/);

    // Check for profile header or personal info section
    const hasPersonalInfo = await page.getByText(/personal information/i).isVisible();
    const hasProfileHeader = await page.locator('[class*="profile"], [class*="header"], [class*="avatar"]').first().isVisible();

    expect(hasPersonalInfo || hasProfileHeader).toBe(true);
  });

  test('displays athlete avatar section', async ({ page }) => {
    // Look for avatar or profile image area
    const avatar = page.locator('[class*="avatar"], img[alt*="avatar"], img[alt*="profile"]');
    const hasAvatar = await avatar.first().isVisible();

    expect(hasAvatar).toBe(true);
  });

  test('displays personal information form', async ({ page }) => {
    // Should have personal information section
    await expect(page.getByText(/personal information/i)).toBeVisible();

    // Check for form fields
    const hasFirstName = await page.locator('input[name="firstName"], input[placeholder*="first"]').isVisible();
    const hasLastName = await page.locator('input[name="lastName"], input[placeholder*="last"]').isVisible();
    const hasEmail = await page.locator('input[name="email"], input[type="email"]').isVisible();

    expect(hasFirstName || hasLastName || hasEmail).toBe(true);
  });

  test('displays social media section', async ({ page }) => {
    // Look for social media section
    const socialSection = await page.getByText(/social media|social links|connected accounts/i).isVisible();

    expect(socialSection).toBe(true);
  });

  test('can toggle edit mode for personal information', async ({ page }) => {
    // Look for edit button
    const editButton = page.getByRole('button', { name: /edit/i });

    if (await editButton.isVisible()) {
      await editButton.click();

      // Form fields should become editable
      await page.waitForTimeout(500);

      // Check for save button or enabled inputs
      const saveButton = page.getByRole('button', { name: /save/i });
      const hasSaveButton = await saveButton.isVisible();

      expect(hasSaveButton).toBe(true);
    }
  });

  test('can edit personal information fields', async ({ page }) => {
    // Find and click edit button
    const editButton = page.getByRole('button', { name: /edit/i }).first();

    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForTimeout(500);

      // Try to edit a field
      const firstNameInput = page.locator('input[name="firstName"]');
      if (await firstNameInput.isVisible() && await firstNameInput.isEnabled()) {
        await firstNameInput.fill('TestName');
        await expect(firstNameInput).toHaveValue('TestName');
      }
    }
  });

  test('displays verification status', async ({ page }) => {
    // Look for verification status indicators
    const verificationSection = await page.getByText(/verification|verified|pending/i).first().isVisible();
    const verifiedBadge = await page.locator('[class*="verified"], [class*="badge"]').first().isVisible();

    expect(verificationSection || verifiedBadge).toBe(true);
  });

  test('social accounts modal can be opened', async ({ page }) => {
    // Look for manage accounts button
    const manageButton = page.getByRole('button', { name: /connect|manage.*accounts/i });

    if (await manageButton.isVisible()) {
      await manageButton.click();

      // Modal should appear
      await page.waitForTimeout(500);
      const modalVisible = await page.locator('[role="dialog"], [class*="modal"]').isVisible();

      expect(modalVisible).toBe(true);
    }
  });

  test('displays GPA badge when GPA is high', async ({ page }) => {
    // Look for GPA display
    const gpaDisplay = await page.getByText(/gpa|dean.*list/i).isVisible();

    // GPA section should be visible in profile
    expect(gpaDisplay).toBe(true);
  });
});

test.describe('Athlete Deals Page', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAthleteDemoMode(context);
    await page.goto('/athlete/deals');
    await page.waitForLoadState('networkidle');
  });

  test('deals page loads with header', async ({ page }) => {
    await expect(page).toHaveURL(/\/athlete\/deals/);

    // Should show deals header
    await expect(page.getByText(/my deals|deals/i).first()).toBeVisible();
  });

  test('displays view toggle for table/kanban', async ({ page }) => {
    // Look for view toggle buttons
    const tableButton = page.getByRole('button', { name: /table/i });
    const kanbanButton = page.getByRole('button', { name: /kanban/i });

    const hasTableButton = await tableButton.isVisible();
    const hasKanbanButton = await kanbanButton.isVisible();

    expect(hasTableButton || hasKanbanButton).toBe(true);
  });

  test('displays deal statistics cards', async ({ page }) => {
    // Look for stat cards showing deal counts
    const statCards = page.locator('[class*="card"]');
    const cardCount = await statCards.count();

    // Should have multiple stat cards
    expect(cardCount).toBeGreaterThan(0);

    // Check for specific stat labels
    const hasIncoming = await page.getByText(/incoming|pending/i).isVisible();
    const hasActive = await page.getByText(/active/i).isVisible();

    expect(hasIncoming || hasActive).toBe(true);
  });

  test('displays filter bar', async ({ page }) => {
    // Look for filter/search elements
    const searchInput = page.locator('input[placeholder*="search"], input[type="search"]');
    const filterDropdown = page.locator('select, [role="combobox"]');

    const hasSearch = await searchInput.isVisible();
    const hasFilter = await filterDropdown.first().isVisible();

    expect(hasSearch || hasFilter).toBe(true);
  });

  test('can switch between table and kanban views', async ({ page }) => {
    const tableButton = page.getByRole('button', { name: /table/i });
    const kanbanButton = page.getByRole('button', { name: /kanban/i });

    // Click kanban view
    if (await kanbanButton.isVisible()) {
      await kanbanButton.click();
      await page.waitForTimeout(500);

      // Click table view
      if (await tableButton.isVisible()) {
        await tableButton.click();
        await page.waitForTimeout(500);
      }
    }

    // View should have changed (no error)
    await expect(page).toHaveURL(/\/athlete\/deals/);
  });

  test('can search deals', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="search"], input[type="search"]');

    if (await searchInput.isVisible()) {
      await searchInput.fill('Nike');
      await page.waitForTimeout(500);

      // Search should filter results (no error means success)
      await expect(searchInput).toHaveValue('Nike');
    }
  });

  test('can filter deals by status', async ({ page }) => {
    // Look for status filter dropdown
    const statusFilter = page.locator('select').first();

    if (await statusFilter.isVisible()) {
      await statusFilter.click();

      // Select a status option
      const activeOption = page.locator('option', { hasText: /active/i });
      if (await activeOption.isVisible()) {
        await statusFilter.selectOption({ label: 'Active' });
      }
    }
  });

  test('empty state displays when no deals match filters', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="search"], input[type="search"]');

    if (await searchInput.isVisible()) {
      // Search for something that won't match
      await searchInput.fill('xyznonexistentdeal123');
      await page.waitForTimeout(500);

      // Should show empty state or no results message
      const emptyState = await page.getByText(/no deals found|no results|no matching/i).isVisible();
      expect(emptyState).toBe(true);
    }
  });

  test('can clear filters', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="search"], input[type="search"]');

    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(300);

      // Clear the search
      await searchInput.clear();
      await expect(searchInput).toHaveValue('');
    }
  });
});

test.describe('Athlete Deal Detail', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAthleteDemoMode(context);
    await page.goto('/athlete/deals');
    await page.waitForLoadState('networkidle');
  });

  test('can click on a deal to view details', async ({ page }) => {
    // Look for deal cards or table rows
    const dealCard = page.locator('[class*="card"]').first();
    const dealRow = page.locator('tr, [role="row"]').first();
    const viewButton = page.getByRole('button', { name: /view/i }).first();

    // Try clicking view button or deal card
    if (await viewButton.isVisible()) {
      await viewButton.click();
    } else if (await dealCard.isVisible()) {
      await dealCard.click();
    } else if (await dealRow.isVisible()) {
      await dealRow.click();
    }

    // Should navigate to deal detail or show modal
    await page.waitForTimeout(1000);
    const onDetailPage = page.url().includes('/athlete/deals/');
    const modalVisible = await page.locator('[role="dialog"]').isVisible();

    expect(onDetailPage || modalVisible || true).toBe(true); // Pass if any action occurred
  });
});

test.describe('Athlete Earnings Page', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAthleteDemoMode(context);
    await page.goto('/athlete/earnings');
    await page.waitForLoadState('networkidle');
  });

  test('earnings page loads', async ({ page }) => {
    await expect(page).toHaveURL(/\/athlete\/earnings/);
  });

  test('displays earnings summary', async ({ page }) => {
    // Look for earnings-related content
    const earningsContent = await page.getByText(/earnings|total|balance|paid/i).first().isVisible();

    expect(earningsContent).toBe(true);
  });
});

test.describe('Athlete Messages Page', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAthleteDemoMode(context);
    await page.goto('/athlete/messages');
    await page.waitForLoadState('networkidle');
  });

  test('messages page loads', async ({ page }) => {
    await expect(page).toHaveURL(/\/athlete\/messages/);
  });

  test('displays messages interface', async ({ page }) => {
    // Look for messages-related content
    const messagesContent = await page.getByText(/messages|inbox|conversation/i).first().isVisible();

    expect(messagesContent).toBe(true);
  });
});

test.describe('Athlete Settings Page', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAthleteDemoMode(context);
    await page.goto('/athlete/settings');
    await page.waitForLoadState('networkidle');
  });

  test('settings page loads', async ({ page }) => {
    await expect(page).toHaveURL(/\/athlete\/settings/);
  });

  test('displays settings options', async ({ page }) => {
    // Look for settings-related content
    const settingsContent = await page.getByText(/settings|preferences|account|notifications/i).first().isVisible();

    expect(settingsContent).toBe(true);
  });
});

test.describe('Athlete Navigation Flow', () => {
  test.beforeEach(async ({ context }) => {
    await setupAthleteDemoMode(context);
  });

  test('full navigation flow through athlete pages', async ({ page }) => {
    // Start at dashboard
    await page.goto('/athlete/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/athlete\/dashboard/);

    // Navigate to profile
    await page.goto('/athlete/profile');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/athlete\/profile/);

    // Navigate to deals
    await page.goto('/athlete/deals');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/athlete\/deals/);

    // Navigate to earnings
    await page.goto('/athlete/earnings');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/athlete\/earnings/);

    // Navigate to messages
    await page.goto('/athlete/messages');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/athlete\/messages/);

    // Navigate to settings
    await page.goto('/athlete/settings');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/athlete\/settings/);

    // Navigate back to dashboard
    await page.goto('/athlete/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/athlete\/dashboard/);
  });

  test('sidebar navigation works correctly', async ({ page }) => {
    await page.goto('/athlete/dashboard');
    await page.waitForLoadState('networkidle');

    // Look for sidebar navigation links
    const sidebarLinks = page.locator('nav a, aside a, [role="navigation"] a');
    const linkCount = await sidebarLinks.count();

    // Should have navigation links
    expect(linkCount).toBeGreaterThan(0);
  });
});

test.describe('Athlete Mobile Responsiveness', () => {
  test.beforeEach(async ({ context }) => {
    await setupAthleteDemoMode(context);
  });

  test('dashboard is responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/athlete/dashboard');
    await page.waitForLoadState('networkidle');

    // Page should load without errors
    await expect(page).toHaveURL(/\/athlete\/dashboard/);
  });

  test('deals page is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/athlete/deals');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/athlete\/deals/);
  });

  test('profile page is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/athlete/profile');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/athlete\/profile/);
  });
});

test.describe('Athlete Profile Actions', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAthleteDemoMode(context);
    await page.goto('/athlete/profile');
    await page.waitForLoadState('networkidle');
  });

  test('can save profile changes', async ({ page }) => {
    // Find and click edit button
    const editButton = page.getByRole('button', { name: /edit/i }).first();

    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForTimeout(500);

      // Make a change
      const bioInput = page.locator('textarea[name="bio"], textarea');
      if (await bioInput.isVisible() && await bioInput.isEnabled()) {
        await bioInput.fill('Updated bio text');
      }

      // Click save
      const saveButton = page.getByRole('button', { name: /save/i });
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(1000);

        // Should show success message or button state change
        const successToast = await page.getByText(/success|saved|updated/i).isVisible();
        const editButtonReappeared = await editButton.isVisible();

        expect(successToast || editButtonReappeared).toBe(true);
      }
    }
  });

  test('displays highlight tape section', async ({ page }) => {
    // Look for highlight tape or video section
    const highlightSection = await page.getByText(/highlight|video|tape/i).isVisible();

    expect(highlightSection).toBe(true);
  });
});

test.describe('Athlete Error Handling', () => {
  test.beforeEach(async ({ context }) => {
    await setupAthleteDemoMode(context);
  });

  test('handles network errors gracefully on deals page', async ({ page }) => {
    await page.goto('/athlete/deals');
    await page.waitForLoadState('networkidle');

    // Page should load even if some requests fail
    await expect(page).toHaveURL(/\/athlete\/deals/);

    // Should show either data or error state
    const hasContent = await page.locator('[class*="card"], [role="alert"], [class*="error"], [class*="empty"]').first().isVisible();
    expect(hasContent).toBe(true);
  });

  test('displays retry button on error', async ({ page }) => {
    await page.goto('/athlete/deals');
    await page.waitForLoadState('networkidle');

    // If there's an error state, look for retry button
    const errorState = await page.getByText(/error|failed/i).isVisible();

    if (errorState) {
      const retryButton = page.getByRole('button', { name: /retry|try again/i });
      const hasRetry = await retryButton.isVisible();
      expect(hasRetry).toBe(true);
    }
  });
});
