import { expect, test, type Page } from "@playwright/test";

const RIDER = `http://localhost:${process.env.E2E_RIDER_PORT ?? 3104}`;

async function login(page: Page, phone: string) {
  await page.goto(`${RIDER}/login`);
  await page.getByPlaceholder("0917100031").fill(phone);
  await page.getByRole("button", { name: "Send code" }).click();
  const devCode = await page.locator("strong").first().textContent();
  await page.getByPlaceholder("123456").fill(devCode!.trim());
  await page.getByRole("button", { name: "Verify" }).click();
}

test("rider books a ride with a live fare quote", async ({ page }) => {
  await login(page, "09200000005");
  await page.waitForURL(`${RIDER}/`);
  await page.getByRole("button", { name: "Get fare" }).click();
  await expect(page.getByText(/₱\d+\.\d{2}/).first()).toBeVisible();
  await page.getByRole("button", { name: "Book ride" }).click();
  await page.waitForURL(/\/rides\/.+/);
  await expect(page.getByText("REQUESTED")).toBeVisible();
  await expect(
    page.getByText("Chat opens once a driver is assigned."),
  ).toBeVisible();
});

test("rider sees ride history", async ({ page }) => {
  await login(page, "09200000005");
  await page.waitForURL(`${RIDER}/`);
  await page.goto(`${RIDER}/rides`);
  await expect(page.getByRole("heading", { name: "My rides" })).toBeVisible();
});
