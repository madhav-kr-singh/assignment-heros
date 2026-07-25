import { test, expect } from '@playwright/test';

// ponytail: Simplified E2E smoke test covering the end-to-end flow in a single run
test.describe('Digital Heroes CRM E2E Smoke Test', () => {
  const testEmail = `e2e-${Date.now()}@test.com`;

  test('should execute public capture, staff login, lead detail update, and logout', async ({ page }) => {
    test.setTimeout(60000); // Allow extra time for Next.js on-demand route compilation
    // --- 1. Public Lead Capture ---
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Grow Your Business');
    await expect(page.locator('footer')).toContainText('Digital Heroes Training Task');

    // Fill and submit the lead form
    await page.fill('#name', 'E2E Test Lead');
    await page.fill('#email', testEmail);
    await page.fill('#company', 'E2E Automation Corp');
    await page.fill('#phone', '+1 555 E2E TEST');
    
    await page.click('button[type="submit"]');

    // Verify submission success state
    await expect(page.locator('text=Inquiry Submitted!')).toBeVisible({ timeout: 15000 });

    // --- 2. Staff Portal Login ---
    await page.goto('/login');
    await page.fill('#email', process.env.ROOT_ADMIN_EMAIL || 'admin@digitalheroes.com');
    await page.fill('#password', process.env.ROOT_ADMIN_PASSWORD || 'admin122333');
    await page.click('button[type="submit"]');

    // Verify redirection to dashboard
    await page.waitForURL('**/dashboard');
    await expect(page.locator('h1')).toContainText('Leads Dashboard');

    // Verify our newly created lead is listed in the dashboard table
    const leadRow = page.locator(`tr:has-text("${testEmail}")`);
    await expect(leadRow).toBeVisible();

    // --- 3. Lead Details & Update ---
    await leadRow.locator('text=Details →').click();
    await page.waitForURL(/\/dashboard\/leads\/[a-f0-9]+/);
    await expect(page.locator('text=Lead Specifications')).toBeVisible({ timeout: 15000 });

    // Modify lead pipeline status
    await page.click('#status-select button'); // Open custom dropdown
    await page.click('button:has-text("Contacted")'); // Click "Contacted" option
    
    // Verify status update reflected in dropdown button text
    await page.waitForTimeout(1000);
    const statusSelectBtn = page.locator('#status-select button');
    await expect(statusSelectBtn).toContainText('Contacted');

    // Add note
    await page.fill('textarea[placeholder="Type a new update note..."]', 'E2E Note: Contacted client successfully.');
    await page.click('button:has-text("Add Note")');

    // Verify note is saved and displayed
    await expect(page.locator('text=E2E Note: Contacted client successfully.')).toBeVisible({ timeout: 15000 });

    // Verify activity trail reflects the note addition
    await expect(page.locator('text=added a note')).toBeVisible({ timeout: 15000 });

    // --- 4. Session Terminate (Logout) ---
    await page.click('button[title="Sign Out"]');
    await page.waitForURL('**/login');
    await expect(page.locator('h2')).toContainText('Staff Portal');
  });
});
