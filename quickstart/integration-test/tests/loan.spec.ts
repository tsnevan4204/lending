// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

import { test, expect } from '@playwright/test';
import { APP_PROVIDER_BASE } from './global.ts';

const LOGIN_URL = `${APP_PROVIDER_BASE}/login`;
const BORROWER_DASHBOARD = `${APP_PROVIDER_BASE}/borrower`;
const FUND_LOAN_URL = `${APP_PROVIDER_BASE}/loans/fund`;

test.describe('Fund loan (accept offer)', () => {
  test('Fund loan with invalid offer ID returns friendly error', async ({ page }) => {
    await page.goto(LOGIN_URL);
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('textbox', { name: /user/i }).fill('app-user');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 10_000 });

    await page.goto(`${FUND_LOAN_URL}?offerId=00invalid-offer-id-no-such-contract`);
    await expect(page.getByRole('heading', { name: /Fund loan \(accept offer\)/ })).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(1500);
    const creditProfileInput = page.getByLabel(/credit profile contract id/i);
    if (await creditProfileInput.isVisible()) {
      const val = await creditProfileInput.inputValue();
      if (!val.trim()) await creditProfileInput.fill('00dummy-credit-profile');
    }
    const fundButton = page.getByRole('button', { name: /Fund loan/ });
    await expect(fundButton).toBeVisible();
    await fundButton.click();

    const formError = page.locator('form .alert.alert-danger');
    await expect(formError).toBeVisible({ timeout: 12_000 });
    await expect(formError).toContainText(/no longer valid|not found|invalid|failed/i);
  });

  test('Borrower can log in, open dashboard, and submit Fund loan when offers exist', async ({ page }) => {
    await page.goto(LOGIN_URL);
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('textbox', { name: /user/i }).fill('app-user');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 10_000 });

    await page.goto(BORROWER_DASHBOARD);
    await expect(page.getByRole('heading', { name: 'Borrower Dashboard' })).toBeVisible({ timeout: 15_000 });

    const acceptLink = page.getByRole('link', { name: 'Accept & fund' }).first();
    const hasOffer = await acceptLink.isVisible().catch(() => false);
    if (!hasOffer) {
      test.info().annotations.push({ type: 'skip-reason', description: 'No offers to accept; create a request and lender offer first.' });
      test.skip();
      return;
    }

    await acceptLink.click();
    await expect(page).toHaveURL(/\/loans\/fund\?offerId=/);
    await expect(page.getByRole('heading', { name: /Fund loan \(accept offer\)/ })).toBeVisible();

    const fundButton = page.getByRole('button', { name: /Fund loan/ });
    await expect(fundButton).toBeVisible();
    await fundButton.click();

    try {
      await page.waitForURL(/\/borrower/, { timeout: 12_000 });
    } catch {
      // May have stayed on fund page with "no longer valid" error
    }

    const hasNoLongerValid = await page.getByText(/no longer valid/i).isVisible().catch(() => false);
    if (hasNoLongerValid) {
      await expect(page.getByRole('alert')).toContainText(/no longer valid/i);
    } else {
      await expect(page).toHaveURL(/\/borrower/);
    }
  });
});
