import { test, expect } from "@playwright/test";

test.describe("Trading", () => {
  test("buy shares: cash decreases and position appears", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("connected")).toBeVisible({ timeout: 15_000 });

    // Initial state: no positions, $10k cash
    await expect(page.getByText("$10,000.00").first()).toBeVisible({ timeout: 5_000 });
    const positionsPanel = page
      .locator("div")
      .filter({ has: page.locator("h2", { hasText: "Positions" }) })
      .first();
    await expect(positionsPanel.getByText("No positions")).toBeVisible();

    // Buy 1 share of AAPL (seed ~$190)
    await page.getByPlaceholder("Ticker").fill("AAPL");
    await page.getByPlaceholder("Qty").fill("1");
    await page.getByText("BUY").click();

    // Position should appear; "No positions" should disappear
    await expect(positionsPanel.getByText("No positions")).not.toBeVisible({
      timeout: 10_000,
    });

    // Cash is now below $10,000 — the exact $10,000.00 text should not be visible
    await expect(page.getByText("$10,000.00").first()).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test("sell shares: cash increases and position updates", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("connected")).toBeVisible({ timeout: 15_000 });

    const positionsPanel = page
      .locator("div")
      .filter({ has: page.locator("h2", { hasText: "Positions" }) })
      .first();

    // Buy 1 share of AAPL
    await page.getByPlaceholder("Ticker").fill("AAPL");
    await page.getByPlaceholder("Qty").fill("1");
    await page.getByText("BUY").click();

    // Wait for position to appear
    await expect(positionsPanel.getByText("No positions")).not.toBeVisible({
      timeout: 10_000,
    });

    // Sell 1 share of AAPL
    await page.getByPlaceholder("Ticker").fill("AAPL");
    await page.getByPlaceholder("Qty").fill("1");
    await page.getByText("SELL").click();

    // After selling the only share, position should disappear
    await expect(positionsPanel.getByText("No positions")).toBeVisible({
      timeout: 10_000,
    });

    // Cash is now back near $10,000 — verify a $10,XXX.XX value appears
    await expect(page.getByText(/^\$10,\d{3}\.\d{2}$/).first()).toBeVisible({
      timeout: 5_000,
    });
  });
});
