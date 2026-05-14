import { test, expect } from "@playwright/test";

test("landing page renders and links to login", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/inbox/i);
  await page.getByRole("link", { name: /Start with Google/i }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("button", { name: /Continue with Google/i })).toBeVisible();
});

test("landing page is mobile-friendly at 360px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(360);
});
