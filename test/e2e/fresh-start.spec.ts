import { test, expect } from "@playwright/test";

test.describe("Fresh start", () => {
  test("default watchlist appears", async ({ page }) => {
    await page.goto("/");
    // Default tickers should be visible in the watchlist
    await expect(page.getByText("AAPL")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("GOOGL")).toBeVisible({ timeout: 10_000 });
  });

  test("$10k balance shown in header", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("$10,000.00").first()).toBeVisible({ timeout: 10_000 });
  });

  test("prices are streaming via SSE", async ({ page }) => {
    await page.goto("/");
    // Wait for the connection indicator to show connected
    await expect(page.getByText("connected")).toBeVisible({ timeout: 15_000 });
    // At least one price cell should show a numeric value
    const priceCell = page.locator("td.tabular-nums").first();
    await expect(priceCell).not.toHaveText("--", { timeout: 10_000 });
  });
});
