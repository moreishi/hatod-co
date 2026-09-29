import { expect, test } from "@playwright/test";
import { API, auth, login } from "./helpers.js";

const RIDE = {
  pickupLabel: "E2E Chat St",
  pickupBrgyCode: "072217001",
  dropoffLabel: "E2E Chat Ave",
  dropoffBrgyCode: "072217002",
  distanceKm: 2,
  vehicleType: "SEDAN",
  paymentMethod: "CASH",
};

test("rider and driver exchange messages with receipts", async ({
  request,
}) => {
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

  const convo = await (
    await request.get(`${API}/api/conversations/by-ride/${ride.id}`, {
      headers: auth(rider),
    })
  ).json();
  expect(convo.status).toBe("ACTIVE");

  const sent = await (
    await request.post(`${API}/api/conversations/${convo.id}/messages`, {
      data: { content: "e2e hello", clientMessageId: `e2e-${ride.id}` },
      headers: auth(rider),
    })
  ).json();
  expect(sent.status).toBe("SENT");

  const retry = await (
    await request.post(`${API}/api/conversations/${convo.id}/messages`, {
      data: { content: "e2e hello", clientMessageId: `e2e-${ride.id}` },
      headers: auth(rider),
    })
  ).json();
  expect(retry.id).toBe(sent.id);

  const page = await (
    await request.get(`${API}/api/conversations/${convo.id}/messages?limit=1`, {
      headers: auth(rider),
    })
  ).json();
  expect(page).toHaveLength(1);

  const driverToken = await login(request, "09200000004");
  const unread = await (
    await request.get(`${API}/api/conversations/unread-count`, {
      headers: auth(driverToken),
    })
  ).json();
  expect(unread.total).toBeGreaterThan(0);
  await request.post(`${API}/api/conversations/${convo.id}/read`, {
    headers: auth(driverToken),
  });
  const after = await (
    await request.get(`${API}/api/conversations/unread-count`, {
      headers: auth(driverToken),
    })
  ).json();
  expect(after.total).toBe(0);

  // Closed conversations reject new messages.
  await request.post(`${API}/api/rides/${ride.id}/transition`, {
    data: { to: "CANCELLED", cancelReason: "e2e done" },
    headers: auth(dispatcher),
  });
  const closed = await request.post(
    `${API}/api/conversations/${convo.id}/messages`,
    {
      data: { content: "too late" },
      headers: auth(rider),
    },
  );
  expect(closed.status()).toBe(400);
});
