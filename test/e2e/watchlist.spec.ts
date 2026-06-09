import { test, expect } from "@playwright/test";

test.describe("Watchlist", () => {
  test("add ticker via UI", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("connected")).toBeVisible({ timeout: 15_000 });

    const input = page.getByPlaceholder("Add ticker");
    await input.fill("SNAP");
    await input.press("Enter");

    await expect(page.getByText("SNAP")).toBeVisible({ timeout: 5_000 });
  });

  test("remove ticker via UI", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("connected")).toBeVisible({ timeout: 15_000 });

    // Add SNAP first
    const input = page.getByPlaceholder("Add ticker");
    await input.fill("SNAP");
    await input.press("Enter");
    await expect(page.getByText("SNAP")).toBeVisible({ timeout: 5_000 });

    // Remove SNAP via the row's remove button
    const snapRow = page.locator("tr", { hasText: "SNAP" });
    await snapRow.getByTitle("Remove").click();
    await expect(page.getByText("SNAP")).not.toBeVisible({ timeout: 5_000 });
  });
});
