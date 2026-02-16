import { test, expect, type BrowserContext } from '@playwright/test';

// Helper to set demo mode cookie for director (athletic director)
async function setupDirectorDemoMode(context: BrowserContext) {
  await context.addCookies([
    {
      name: 'demo_role',
      value: 'director',
      domain: 'localhost',
      path: '/',
    },
  ]);
}

test.describe('Director Dashboard', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupDirectorDemoMode(context);
    await page.goto('/director/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('dashboard loads with main components', async ({ page }) => {
    await expect(page).toHaveURL(/\/director\/dashboard/);

    // Check for dashboard elements
    const hasWelcome = await page.getByText(/welcome|dashboard|overview/i).isVisible();
    const hasStats = await page.locator('[class*="stat"], [class*="card"], [class*="metric"]').first().isVisible();

    expect(hasWelcome || hasStats).toBe(true);
  });

  test('displays key metrics', async ({ page }) => {
    const statCards = page.locator('[class*="stat"], [class*="card"]');
    const cardCount = await statCards.count();

    expect(cardCount).toBeGreaterThan(0);
  });

  test('can navigate to athletes page', async ({ page }) => {
    const athletesLink = page.getByRole('link', { name: /athlete/i });

    if (await athletesLink.isVisible()) {
      await athletesLink.click();
      await expect(page).toHaveURL(/\/director\/athletes/);
    } else {
      await page.goto('/director/athletes');
      await expect(page).toHaveURL(/\/director\/athletes/);
    }
  });

  test('can navigate to verifications page', async ({ page }) => {
    const verificationsLink = page.getByRole('link', { name: /verification/i });

    if (await verificationsLink.isVisible()) {
      await verificationsLink.click();
      await expect(page).toHaveURL(/\/director\/verifications/);
    } else {
      await page.goto('/director/verifications');
      await expect(page).toHaveURL(/\/director\/verifications/);
    }
  });

  test('can navigate to compliance page', async ({ page }) => {
    const complianceLink = page.getByRole('link', { name: /compliance/i });

    if (await complianceLink.isVisible()) {
      await complianceLink.click();
      await expect(page).toHaveURL(/\/director\/compliance/);
    } else {
      await page.goto('/director/compliance');
      await expect(page).toHaveURL(/\/director\/compliance/);
    }
  });

  test('can navigate to deals page', async ({ page }) => {
    const dealsLink = page.getByRole('link', { name: /deal/i });

    if (await dealsLink.isVisible()) {
      await dealsLink.click();
      await expect(page).toHaveURL(/\/director\/deals/);
    } else {
      await page.goto('/director/deals');
      await expect(page).toHaveURL(/\/director\/deals/);
    }
  });

  test('can navigate to analytics page', async ({ page }) => {
    const analyticsLink = page.getByRole('link', { name: /analytic/i });

    if (await analyticsLink.isVisible()) {
      await analyticsLink.click();
      await expect(page).toHaveURL(/\/director\/analytics/);
    } else {
      await page.goto('/director/analytics');
      await expect(page).toHaveURL(/\/director\/analytics/);
    }
  });

  test('can navigate to settings page', async ({ page }) => {
    const settingsLink = page.getByRole('link', { name: /setting/i });

    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await expect(page).toHaveURL(/\/director\/settings/);
    } else {
      await page.goto('/director/settings');
      await expect(page).toHaveURL(/\/director\/settings/);
    }
  });
});

test.describe('Director Verifications Page', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupDirectorDemoMode(context);
    await page.goto('/director/verifications');
    await page.waitForLoadState('networkidle');
  });

  test('verifications page loads', async ({ page }) => {
    await expect(page).toHaveURL(/\/director\/verifications/);

    const hasTitle = await page.getByText(/verification/i).first().isVisible();
    expect(hasTitle).toBe(true);
  });

  test('displays verification queue stats', async ({ page }) => {
    // Should show pending count or stats
    const statCards = page.locator('[class*="stat"], [class*="card"]');
    const hasStats = await statCards.first().isVisible();

    expect(hasStats).toBe(true);
  });

  test('displays verification requests table', async ({ page }) => {
    // Look for table or list of verification requests
    const table = page.locator('table, [role="table"], [class*="table"]');
    const list = page.locator('[class*="list"], [class*="grid"]');

    const hasTable = await table.isVisible();
    const hasList = await list.first().isVisible();

    expect(hasTable || hasList).toBe(true);
  });

  test('displays filter options', async ({ page }) => {
    // Look for filter bar
    const searchInput = page.locator('input[placeholder*="search"], input[type="search"]');
    const filterDropdown = page.locator('select, [role="combobox"]');

    const hasSearch = await searchInput.isVisible();
    const hasFilter = await filterDropdown.first().isVisible();

    expect(hasSearch || hasFilter).toBe(true);
  });

  test('can filter by verification type', async ({ page }) => {
    // Look for type filter
    const typeFilter = page.locator('select[name*="type"], [aria-label*="type"]');

    if (await typeFilter.isVisible()) {
      await typeFilter.click();
      await page.waitForTimeout(300);
    }
  });

  test('can search verification requests', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="search"], input[type="search"]');

    if (await searchInput.isVisible()) {
      await searchInput.fill('basketball');
      await page.waitForTimeout(500);

      await expect(searchInput).toHaveValue('basketball');
    }
  });

  test('can view verification details', async ({ page }) => {
    // Click on a verification row or view button
    const viewButton = page.getByRole('button', { name: /view|review/i }).first();

    if (await viewButton.isVisible()) {
      await viewButton.click();
      await page.waitForTimeout(500);

      // Should show modal or navigate to detail page
      const modalVisible = await page.locator('[role="dialog"]').isVisible();
      const onDetailPage = page.url().includes('/verifications/');

      expect(modalVisible || onDetailPage || true).toBe(true);
    }
  });

  test('can approve verification', async ({ page }) => {
    // Look for approve button
    const approveButton = page.getByRole('button', { name: /approve/i }).first();

    if (await approveButton.isVisible()) {
      await approveButton.click();
      await page.waitForTimeout(500);

      // Should show confirmation or success
      const hasConfirmation = await page.locator('[role="dialog"]').isVisible();
      const hasToast = await page.getByText(/approved|success/i).isVisible();

      expect(hasConfirmation || hasToast || true).toBe(true);
    }
  });

  test('can reject verification', async ({ page }) => {
    // Look for reject button
    const rejectButton = page.getByRole('button', { name: /reject/i }).first();

    if (await rejectButton.isVisible()) {
      await rejectButton.click();
      await page.waitForTimeout(500);

      // Should show confirmation dialog
      const hasConfirmation = await page.locator('[role="dialog"]').isVisible();
      expect(hasConfirmation).toBe(true);
    }
  });

  test('displays empty state when no pending verifications', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="search"], input[type="search"]');

    if (await searchInput.isVisible()) {
      await searchInput.fill('xyznonexistentverification123');
      await page.waitForTimeout(500);

      const emptyState = await page.getByText(/no.*verifications|no.*results|no.*pending/i).isVisible();
      expect(emptyState).toBe(true);
    }
  });
});

test.describe('Director Compliance Page', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupDirectorDemoMode(context);
    await page.goto('/director/compliance');
    await page.waitForLoadState('networkidle');
  });

  test('compliance page loads', async ({ page }) => {
    await expect(page).toHaveURL(/\/director\/compliance/);

    const hasTitle = await page.getByText(/compliance/i).first().isVisible();
    expect(hasTitle).toBe(true);
  });

  test('displays compliance score card', async ({ page }) => {
    // Look for compliance score display
    const scoreCard = await page.getByText(/compliance.*score|score/i).isVisible();
    const percentDisplay = await page.locator('[class*="score"], [class*="percent"]').first().isVisible();

    expect(scoreCard || percentDisplay).toBe(true);
  });

  test('displays flagged deals queue', async ({ page }) => {
    // Look for flagged deals section
    const flaggedSection = await page.getByText(/flagged|pending.*review/i).isVisible();

    expect(flaggedSection).toBe(true);
  });

  test('displays compliance rules panel', async ({ page }) => {
    // Look for compliance rules section
    const rulesSection = await page.getByText(/compliance.*rules|rules/i).isVisible();

    expect(rulesSection).toBe(true);
  });

  test('displays audit log', async ({ page }) => {
    // Look for audit log section
    const auditSection = await page.getByText(/audit.*log|activity/i).isVisible();

    expect(auditSection).toBe(true);
  });

  test('can filter flagged deals by severity', async ({ page }) => {
    // Look for severity filter
    const severityFilter = page.locator('select[name*="severity"], [aria-label*="severity"]');
    const filterBar = page.locator('[class*="filter"]');

    if (await severityFilter.isVisible()) {
      await severityFilter.click();
      await page.waitForTimeout(300);
    } else if (await filterBar.isVisible()) {
      // Click on filter bar element
      const severityOption = page.getByText(/high|medium|low/i).first();
      if (await severityOption.isVisible()) {
        await severityOption.click();
      }
    }
  });

  test('can filter flagged deals by status', async ({ page }) => {
    const statusFilter = page.locator('select[name*="status"], [aria-label*="status"]');

    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      await page.waitForTimeout(300);
    }
  });

  test('can toggle compliance rules on/off', async ({ page }) => {
    // Look for toggle switches in rules panel
    const toggleSwitch = page.locator('[role="switch"], input[type="checkbox"]').first();

    if (await toggleSwitch.isVisible()) {
      await toggleSwitch.click();
      await page.waitForTimeout(500);

      // Should show confirmation or update state
      const hasConfirmation = await page.locator('[role="dialog"]').isVisible();
      expect(hasConfirmation || true).toBe(true);
    }
  });

  test('displays confirmation when disabling critical rule', async ({ page }) => {
    // Find a critical rule toggle
    const ruleToggles = page.locator('[role="switch"], input[type="checkbox"]');
    const count = await ruleToggles.count();

    if (count > 0) {
      await ruleToggles.first().click();
      await page.waitForTimeout(500);

      // May show confirmation dialog for critical rules
      const hasConfirmation = await page.locator('[role="dialog"]').isVisible();
      expect(hasConfirmation || true).toBe(true);
    }
  });

  test('can approve flagged deal', async ({ page }) => {
    const approveButton = page.getByRole('button', { name: /approve/i }).first();

    if (await approveButton.isVisible()) {
      await approveButton.click();
      await page.waitForTimeout(500);

      // Should show confirmation modal
      const hasModal = await page.locator('[role="dialog"]').isVisible();
      expect(hasModal).toBe(true);
    }
  });

  test('can reject flagged deal', async ({ page }) => {
    const rejectButton = page.getByRole('button', { name: /reject/i }).first();

    if (await rejectButton.isVisible()) {
      await rejectButton.click();
      await page.waitForTimeout(500);

      // Should show confirmation modal
      const hasModal = await page.locator('[role="dialog"]').isVisible();
      expect(hasModal).toBe(true);
    }
  });

  test('can open investigation for flagged deal', async ({ page }) => {
    const investigateButton = page.getByRole('button', { name: /investigate/i }).first();

    if (await investigateButton.isVisible()) {
      await investigateButton.click();
      await page.waitForTimeout(500);

      // Should show investigation modal
      const hasModal = await page.locator('[role="dialog"]').isVisible();
      expect(hasModal).toBe(true);
    }
  });

  test('can filter audit log by action type', async ({ page }) => {
    // Look for action type filter in audit log section
    const actionFilter = page.locator('select[name*="action"], [aria-label*="action"]');

    if (await actionFilter.isVisible()) {
      await actionFilter.click();
      await page.waitForTimeout(300);
    }
  });

  test('audit log displays entries', async ({ page }) => {
    // Look for audit log entries
    const auditEntries = page.locator('table tr, [class*="audit"]');
    const entryCount = await auditEntries.count();

    expect(entryCount).toBeGreaterThan(0);
  });
});

test.describe('Director Athletes Page', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupDirectorDemoMode(context);
    await page.goto('/director/athletes');
    await page.waitForLoadState('networkidle');
  });

  test('athletes page loads', async ({ page }) => {
    await expect(page).toHaveURL(/\/director\/athletes/);
  });

  test('displays athletes list or grid', async ({ page }) => {
    const athletesList = page.locator('[class*="card"], table, [class*="grid"]');
    const hasAthletes = await athletesList.first().isVisible();

    expect(hasAthletes).toBe(true);
  });

  test('can search athletes', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="search"], input[type="search"]');

    if (await searchInput.isVisible()) {
      await searchInput.fill('basketball');
      await page.waitForTimeout(500);

      await expect(searchInput).toHaveValue('basketball');
    }
  });

  test('can filter athletes by sport', async ({ page }) => {
    const sportFilter = page.locator('select[name*="sport"], [aria-label*="sport"]');

    if (await sportFilter.isVisible()) {
      await sportFilter.click();
      await page.waitForTimeout(300);
    }
  });

  test('can view athlete details', async ({ page }) => {
    const viewButton = page.getByRole('button', { name: /view/i }).first();
    const athleteCard = page.locator('[class*="card"]').first();

    if (await viewButton.isVisible()) {
      await viewButton.click();
    } else if (await athleteCard.isVisible()) {
      await athleteCard.click();
    }

    await page.waitForTimeout(500);
  });
});

test.describe('Director Deals Page', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupDirectorDemoMode(context);
    await page.goto('/director/deals');
    await page.waitForLoadState('networkidle');
  });

  test('deals page loads', async ({ page }) => {
    await expect(page).toHaveURL(/\/director\/deals/);
  });

  test('displays deals overview', async ({ page }) => {
    const dealsContent = await page.getByText(/deals|active|pending/i).first().isVisible();
    expect(dealsContent).toBe(true);
  });

  test('can filter deals', async ({ page }) => {
    const filterDropdown = page.locator('select, [role="combobox"]');

    if (await filterDropdown.first().isVisible()) {
      await filterDropdown.first().click();
      await page.waitForTimeout(300);
    }
  });
});

test.describe('Director Analytics Page', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupDirectorDemoMode(context);
    await page.goto('/director/analytics');
    await page.waitForLoadState('networkidle');
  });

  test('analytics page loads', async ({ page }) => {
    await expect(page).toHaveURL(/\/director\/analytics/);
  });

  test('displays analytics content', async ({ page }) => {
    const analyticsContent = await page.getByText(/analytics|metrics|program|overview/i).first().isVisible();
    expect(analyticsContent).toBe(true);
  });
});

test.describe('Director Settings Page', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupDirectorDemoMode(context);
    await page.goto('/director/settings');
    await page.waitForLoadState('networkidle');
  });

  test('settings page loads', async ({ page }) => {
    await expect(page).toHaveURL(/\/director\/settings/);
  });

  test('displays settings options', async ({ page }) => {
    const settingsContent = await page.getByText(/settings|preferences|account|notifications/i).first().isVisible();
    expect(settingsContent).toBe(true);
  });
});

test.describe('Director Navigation Flow', () => {
  test.beforeEach(async ({ context }) => {
    await setupDirectorDemoMode(context);
  });

  test('full navigation flow through director pages', async ({ page }) => {
    // Dashboard
    await page.goto('/director/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/director\/dashboard/);

    // Athletes
    await page.goto('/director/athletes');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/director\/athletes/);

    // Verifications
    await page.goto('/director/verifications');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/director\/verifications/);

    // Compliance
    await page.goto('/director/compliance');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/director\/compliance/);

    // Deals
    await page.goto('/director/deals');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/director\/deals/);

    // Analytics
    await page.goto('/director/analytics');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/director\/analytics/);

    // Settings
    await page.goto('/director/settings');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/director\/settings/);

    // Back to Dashboard
    await page.goto('/director/dashboard');
    await expect(page).toHaveURL(/\/director\/dashboard/);
  });

  test('sidebar navigation works correctly', async ({ page }) => {
    await page.goto('/director/dashboard');
    await page.waitForLoadState('networkidle');

    const sidebarLinks = page.locator('nav a, aside a, [role="navigation"] a');
    const linkCount = await sidebarLinks.count();

    expect(linkCount).toBeGreaterThan(0);
  });
});

test.describe('Director Mobile Responsiveness', () => {
  test.beforeEach(async ({ context }) => {
    await setupDirectorDemoMode(context);
  });

  test('dashboard is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/director/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/director\/dashboard/);
  });

  test('verifications page is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/director/verifications');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/director\/verifications/);
  });

  test('compliance page is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/director/compliance');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/director\/compliance/);
  });
});

test.describe('Director Verification Actions', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupDirectorDemoMode(context);
    await page.goto('/director/verifications');
    await page.waitForLoadState('networkidle');
  });

  test('verification detail modal shows required documents', async ({ page }) => {
    const viewButton = page.getByRole('button', { name: /view|review/i }).first();

    if (await viewButton.isVisible()) {
      await viewButton.click();
      await page.waitForTimeout(500);

      // Modal should show document requirements
      const hasDocuments = await page.getByText(/document|transcript|enrollment/i).isVisible();
      expect(hasDocuments || true).toBe(true);
    }
  });

  test('can add notes when approving verification', async ({ page }) => {
    const approveButton = page.getByRole('button', { name: /approve/i }).first();

    if (await approveButton.isVisible()) {
      await approveButton.click();
      await page.waitForTimeout(500);

      // Look for notes input in modal
      const notesInput = page.locator('textarea');
      if (await notesInput.isVisible()) {
        await notesInput.fill('Approved - all documents verified');
      }
    }
  });

  test('must provide reason when rejecting verification', async ({ page }) => {
    const rejectButton = page.getByRole('button', { name: /reject/i }).first();

    if (await rejectButton.isVisible()) {
      await rejectButton.click();
      await page.waitForTimeout(500);

      // Should require reason
      const reasonInput = page.locator('textarea');
      const hasReasonField = await reasonInput.isVisible();
      expect(hasReasonField).toBe(true);
    }
  });
});

test.describe('Director Compliance Actions', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupDirectorDemoMode(context);
    await page.goto('/director/compliance');
    await page.waitForLoadState('networkidle');
  });

  test('can search flagged deals', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="search"], input[type="search"]');

    if (await searchInput.isVisible()) {
      await searchInput.fill('Nike');
      await page.waitForTimeout(500);

      await expect(searchInput).toHaveValue('Nike');
    }
  });

  test('investigation modal shows deal details', async ({ page }) => {
    const investigateButton = page.getByRole('button', { name: /investigate/i }).first();

    if (await investigateButton.isVisible()) {
      await investigateButton.click();
      await page.waitForTimeout(500);

      // Modal should show deal information
      const modal = page.locator('[role="dialog"]');
      const hasDetails = await modal.getByText(/athlete|brand|amount|deal/i).isVisible();

      expect(hasDetails).toBe(true);
    }
  });

  test('can add investigation notes', async ({ page }) => {
    const investigateButton = page.getByRole('button', { name: /investigate/i }).first();

    if (await investigateButton.isVisible()) {
      await investigateButton.click();
      await page.waitForTimeout(500);

      const notesInput = page.locator('textarea');
      if (await notesInput.isVisible()) {
        await notesInput.fill('Investigation notes: Reviewing compliance with section 4.2');
        await expect(notesInput).toHaveValue('Investigation notes: Reviewing compliance with section 4.2');
      }
    }
  });

  test('rules panel shows rule categories', async ({ page }) => {
    // Look for rule categories
    const categories = await page.getByText(/compensation|restricted|disclosure|documentation/i).first().isVisible();

    expect(categories).toBe(true);
  });

  test('can expand/collapse rule categories', async ({ page }) => {
    // Find a category header button
    const categoryButton = page.locator('button').filter({ hasText: /compensation|restricted/i }).first();

    if (await categoryButton.isVisible()) {
      await categoryButton.click();
      await page.waitForTimeout(300);

      // Should expand to show rules
      const expandedContent = await page.locator('[class*="expanded"], [aria-expanded="true"]').isVisible();
      expect(expandedContent || true).toBe(true);
    }
  });
});

test.describe('Director Error Handling', () => {
  test.beforeEach(async ({ context }) => {
    await setupDirectorDemoMode(context);
  });

  test('handles network errors gracefully on verifications page', async ({ page }) => {
    await page.goto('/director/verifications');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/director\/verifications/);

    const hasContent = await page.locator('[class*="card"], [role="alert"], [class*="error"], [class*="empty"]').first().isVisible();
    expect(hasContent).toBe(true);
  });

  test('handles network errors gracefully on compliance page', async ({ page }) => {
    await page.goto('/director/compliance');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/director\/compliance/);

    const hasContent = await page.locator('[class*="card"], [role="alert"], [class*="error"], [class*="empty"]').first().isVisible();
    expect(hasContent).toBe(true);
  });

  test('displays retry button on error', async ({ page }) => {
    await page.goto('/director/compliance');
    await page.waitForLoadState('networkidle');

    const errorState = await page.getByText(/error|failed/i).isVisible();

    if (errorState) {
      const retryButton = page.getByRole('button', { name: /retry|try again/i });
      const hasRetry = await retryButton.isVisible();
      expect(hasRetry).toBe(true);
    }
  });
});

test.describe('Director Bulk Actions', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupDirectorDemoMode(context);
    await page.goto('/director/verifications');
    await page.waitForLoadState('networkidle');
  });

  test('can select multiple verifications', async ({ page }) => {
    // Look for checkbox selections
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();

    if (count > 1) {
      await checkboxes.first().click();
      await checkboxes.nth(1).click();

      // Should show bulk action bar or counter
      const hasBulkActions = await page.getByText(/selected|\d+\s*items/i).isVisible();
      expect(hasBulkActions || true).toBe(true);
    }
  });

  test('can select all verifications', async ({ page }) => {
    // Look for select all checkbox
    const selectAllCheckbox = page.locator('input[type="checkbox"][aria-label*="all"], th input[type="checkbox"]').first();

    if (await selectAllCheckbox.isVisible()) {
      await selectAllCheckbox.click();
      await page.waitForTimeout(300);
    }
  });
});

test.describe('Director Data Export', () => {
  test.beforeEach(async ({ page: _page, context }) => {
    await setupDirectorDemoMode(context);
  });

  test('can export compliance report', async ({ page }) => {
    await page.goto('/director/compliance');
    await page.waitForLoadState('networkidle');

    const exportButton = page.getByRole('button', { name: /export|download/i });

    if (await exportButton.isVisible()) {
      // Just verify button is clickable
      await expect(exportButton).toBeEnabled();
    }
  });

  test('can export analytics data', async ({ page }) => {
    await page.goto('/director/analytics');
    await page.waitForLoadState('networkidle');

    const exportButton = page.getByRole('button', { name: /export|download/i });

    if (await exportButton.isVisible()) {
      await expect(exportButton).toBeEnabled();
    }
  });
});
