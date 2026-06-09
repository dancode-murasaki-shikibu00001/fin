import { test, expect } from "@playwright/test";

test.describe("Portfolio visualization", () => {
  test("heatmap renders with positions", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("connected")).toBeVisible({ timeout: 15_000 });

    const heatmapPanel = page
      .locator("div")
      .filter({ has: page.locator("h2", { hasText: "Portfolio Heatmap" }) })
      .first();

    // Initial state: no positions
    await expect(heatmapPanel.getByText("No positions")).toBeVisible({
      timeout: 5_000,
    });

    // Buy some AAPL
    await page.getByPlaceholder("Ticker").fill("AAPL");
    await page.getByPlaceholder("Qty").fill("5");
    await page.getByText("BUY").click();

    // Heatmap should now show AAPL content (no more "No positions")
    await expect(heatmapPanel.getByText("No positions")).not.toBeVisible({
      timeout: 10_000,
    });
    await expect(heatmapPanel.getByText("AAPL")).toBeVisible({ timeout: 5_000 });
  });

  test("P&L chart has data after trades", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("connected")).toBeVisible({ timeout: 15_000 });

    // Buy 1 AAPL — records snapshot 1
    await page.getByPlaceholder("Ticker").fill("AAPL");
    await page.getByPlaceholder("Qty").fill("1");
    await page.getByText("BUY").click();

    // Wait for position to appear (buy confirmed)
    const positionsPanel = page
      .locator("div")
      .filter({ has: page.locator("h2", { hasText: "Positions" }) })
      .first();
    await expect(positionsPanel.getByText("No positions")).not.toBeVisible({
      timeout: 10_000,
    });

    // Sell 1 AAPL — records snapshot 2
    await page.getByPlaceholder("Ticker").fill("AAPL");
    await page.getByPlaceholder("Qty").fill("1");
    await page.getByText("SELL").click();

    // Wait for position to disappear (sell confirmed)
    await expect(positionsPanel.getByText("No positions")).toBeVisible({
      timeout: 10_000,
    });

    // Reload so PnlChart fetches the 2 new snapshots on mount
    await page.reload();
    await expect(page.getByText("connected")).toBeVisible({ timeout: 15_000 });

    // P&L chart should now render (no longer "Waiting for data...")
    const pnlPanel = page
      .locator("div")
      .filter({ has: page.locator("h2", { hasText: "P&L" }) })
      .first();
    await expect(pnlPanel.getByText("Waiting for data...")).not.toBeVisible({
      timeout: 10_000,
    });
  });
});
