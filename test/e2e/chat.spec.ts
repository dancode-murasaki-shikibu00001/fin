import { test, expect } from "@playwright/test";

test.describe("AI Chat (mocked)", () => {
  test("send message and receive response", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("connected")).toBeVisible({ timeout: 15_000 });

    // Chat panel should show the empty-state prompt
    await expect(
      page.getByText("Ask about stocks, trade, or manage your watchlist.")
    ).toBeVisible();

    // Type and send a message
    const chatInput = page.getByPlaceholder("Message...");
    await chatInput.fill("hello");
    await page.getByRole("button", { name: "Send" }).click();

    // User message should appear immediately
    await expect(page.getByText("hello")).toBeVisible();

    // Assistant response should arrive (mock returns a greeting)
    await expect(
      page.getByText(/FinAlly|trading assistant/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("loading state appears while waiting for response", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("connected")).toBeVisible({ timeout: 15_000 });

    const chatInput = page.getByPlaceholder("Message...");
    await chatInput.fill("show portfolio");

    // Input is enabled before send
    await expect(chatInput).not.toBeDisabled();

    await page.getByRole("button", { name: "Send" }).click();

    // Input becomes disabled while loading
    await expect(chatInput).toBeDisabled();

    // Wait for response — input re-enables
    await expect(chatInput).not.toBeDisabled({ timeout: 10_000 });
  });

  test("messages render correctly in chat history", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("connected")).toBeVisible({ timeout: 15_000 });

    const chatInput = page.getByPlaceholder("Message...");

    // Send first message
    await chatInput.fill("show portfolio");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(chatInput).not.toBeDisabled({ timeout: 10_000 });

    // Send second message
    await chatInput.fill("hello");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(chatInput).not.toBeDisabled({ timeout: 10_000 });

    // Both user messages should be visible in the chat history
    await expect(page.getByText("show portfolio")).toBeVisible();
    await expect(page.getByText("hello")).toBeVisible();
  });

  test("send button is disabled when input is empty", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("connected")).toBeVisible({ timeout: 15_000 });

    await expect(page.getByRole("button", { name: "Send" })).toBeDisabled();
  });
});
