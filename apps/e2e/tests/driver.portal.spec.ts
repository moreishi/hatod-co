import { expect, test } from "@playwright/test";
import { API, auth, login } from "./helpers.js";

const DRIVER = `http://localhost:${process.env.E2E_DRIVER_PORT ?? 3105}`;

const RIDE = {
  pickupLabel: "E2E Driver Test Pickup",
  pickupBrgyCode: "072217001",
  dropoffLabel: "E2E Driver Test Drop",
  dropoffBrgyCode: "072217002",
  distanceKm: 3,
  vehicleType: "SEDAN",
  paymentMethod: "CASH",
};

test("driver goes online, accepts, drives, and chats", async ({
  page,
  request,
}) => {
  // Arrange a ride through the API: rider requests, dispatcher assigns.
  const rider = await login(request, "09200000005");
  const created = await request.post(`${API}/api/rides`, {
    data: RIDE,
    headers: auth(rider),
  });
  const ride = await created.json();
  const dispatcher = await login(request, "09200000003");
  const mine = await request.get(`${API}/api/agencies/mine`, {
    headers: auth(dispatcher),
  });
  const agencyId = ((await mine.json()) as { id: string }[])[0].id;
  const list = await request.get(`${API}/api/agencies/${agencyId}/drivers`, {
    headers: auth(dispatcher),
  });
  const driver = ((await list.json()) as { id: string; status: string }[]).find(
    (d) => d.status === "ACTIVE",
  )!;
  await request.post(`${API}/api/rides/${ride.id}/assign`, {
    data: { driverId: driver.id },
    headers: auth(dispatcher),
  });

  // Driver portal: login, online, open the assignment, accept, chat.
  await page.goto(`${DRIVER}/login`);
  await page.getByPlaceholder("0917100011").fill("09200000004");
  await page.getByRole("button", { name: "Send code" }).click();
  const devCode = await page.locator("strong").first().textContent();
  await page.getByPlaceholder("123456").fill(devCode!.trim());
  await page.getByRole("button", { name: "Verify" }).click();
  await page.waitForURL(`${DRIVER}/`);
  await page.getByRole("button", { name: "Go online" }).click();
  await expect(page.getByText("ONLINE")).toBeVisible();
  await page.getByRole("link", { name: /Current ride/ }).click();
  await page.getByRole("button", { name: "Accept" }).click();
  await expect(page.getByText("awaiting your accept")).toBeHidden();
  await page.getByRole("button", { name: /DRIVER_EN_ROUTE/ }).click();
  await expect(page.getByText("DRIVER_EN_ROUTE")).toBeVisible();

  // Chat with the rider from the driver side.
  await page.getByPlaceholder("Message your rider.").fill("On my way!");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("On my way!")).toBeVisible();
});
