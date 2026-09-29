import { expect, test } from "@playwright/test";

const ADMIN = `http://localhost:${process.env.E2E_ADMIN_PORT ?? 3100}`;
const AGENCY = `http://localhost:${process.env.E2E_AGENCY_PORT ?? 3102}`;

test("admin login lands on the session page", async ({ page }) => {
  await page.goto(`${ADMIN}/login`);
  await page.getByPlaceholder("0917100000").fill("09200000001");
  await page.getByRole("button", { name: "Send code" }).click();
  const devCode = await page.locator("strong").first().textContent();
  await page.getByPlaceholder("123456").fill(devCode!.trim());
  await page.getByRole("button", { name: "Verify" }).click();
  await page.waitForURL("**/me");
  await expect(page.getByText("SUPER_ADMIN")).toBeVisible();
});

test("agency login lists the agency and its drivers", async ({ page }) => {
  await page.goto(`${AGENCY}/login`);
  await page.getByPlaceholder("0917100003").fill("09200000002");
  await page.getByRole("button", { name: "Send code" }).click();
  const devCode = await page.locator("strong").first().textContent();
  await page.getByPlaceholder("123456").fill(devCode!.trim());
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByText("E2E Wheels")).toBeVisible();
  await page.getByText("Open driver board").click();
  await expect(page.getByText("E2E Driver")).toBeVisible();
});
