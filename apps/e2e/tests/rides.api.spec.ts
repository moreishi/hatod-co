import { expect, test } from "@playwright/test";
import { API, auth, login } from "./helpers.js";

const RIDE = {
  pickupLabel: "E2E Pickup",
  pickupBrgyCode: "072217001",
  dropoffLabel: "E2E Drop",
  dropoffBrgyCode: "072217002",
  distanceKm: 4,
  vehicleType: "SEDAN",
  paymentMethod: "CASH",
};

test("ride lifecycle settles the ledger and guards transitions", async ({
  request,
}) => {
  const rider = await login(request, "09200000005");
  const created = await request.post(`${API}/api/rides`, {
    data: RIDE,
    headers: auth(rider),
  });
  expect(created.ok()).toBe(true);
  const ride = await created.json();
  expect(ride.status).toBe("REQUESTED");
  expect(ride.fareCentavos).toBe(4000 + 4 * 1500);

  const dispatcher = await login(request, "09200000003");
  // Resolve the agency + driver through the membership-scoped endpoints.
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
  const assigned = await request.post(`${API}/api/rides/${ride.id}/assign`, {
    data: { driverId: driver.id },
    headers: auth(dispatcher),
  });
  expect(assigned.ok()).toBe(true);

  for (const to of [
    "DRIVER_EN_ROUTE",
    "DRIVER_ARRIVED",
    "IN_PROGRESS",
    "COMPLETED",
  ]) {
    const moved = await request.post(`${API}/api/rides/${ride.id}/transition`, {
      data: { to },
      headers: auth(dispatcher),
    });
    expect(moved.ok(), to).toBe(true);
  }

  const admin = await login(request, "09200000001");
  const txns = await request.get(`${API}/api/admin/transactions`, {
    headers: auth(admin),
  });
  const rows = (
    (await txns.json()) as {
      type: string;
      amountCentavos: number;
      rideId: string;
    }[]
  ).filter((t) => t.rideId === ride.id);
  const earning = rows.find((t) => t.type === "RIDE_EARNING")!;
  const commission = rows.find((t) => t.type === "COMMISSION")!;
  expect(earning.amountCentavos + commission.amountCentavos).toBe(
    ride.fareCentavos,
  );

  const illegal = await request.post(`${API}/api/rides/${ride.id}/transition`, {
    data: { to: "ASSIGNED" },
    headers: auth(dispatcher),
  });
  expect(illegal.ok()).toBe(false);
});

test("riders cannot touch each other's rides", async ({ request }) => {
  const riderA = await login(request, "09200000005");
  const created = await request.post(`${API}/api/rides`, {
    data: RIDE,
    headers: auth(riderA),
  });
  const ride = await created.json();

  // No conversation yet → 404, not 500.
  const riderB = await login(request, "09200000006");
  const missing = await request.get(
    `${API}/api/conversations/by-ride/${ride.id}`,
    {
      headers: auth(riderB),
    },
  );
  expect(missing.status()).toBe(404);

  // After assignment the conversation exists but riderB is a stranger → 403.
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
  const forbidden = await request.get(
    `${API}/api/conversations/by-ride/${ride.id}`,
    {
      headers: auth(riderB),
    },
  );
  expect(forbidden.status()).toBe(403);

  // Free the driver for later tests.
  await request.post(`${API}/api/rides/${ride.id}/transition`, {
    data: { to: "CANCELLED", cancelReason: "e2e cleanup" },
    headers: auth(riderA),
  });
});

test("requests auto-match to nearby online drivers", async ({ request }) => {
  const driver = await login(request, "09200000004");
  await request.post(`${API}/api/drivers/me/online`, {
    data: { online: true },
    headers: auth(driver),
  });
  await request.post(`${API}/api/drivers/me/location`, {
    data: { lat: 10.3181, lng: 123.9054 },
    headers: auth(driver),
  });
  const rider = await login(request, "09200000005");
  const created = await request.post(`${API}/api/rides`, {
    data: {
      ...RIDE,
      pickupLat: 10.3185,
      pickupLng: 123.906,
    },
    headers: auth(rider),
  });
  const ride = await created.json();
  let offers: { rideId: string }[] = [];
  for (let i = 0; i < 20 && offers.length === 0; i += 1) {
    await new Promise((r) => setTimeout(r, 500));
    offers = (await (
      await request.get(`${API}/api/drivers/me/offers`, {
        headers: auth(driver),
      })
    ).json()) as { rideId: string }[];
  }
  expect(offers.length).toBeGreaterThan(0);
  const accepted = await request.post(
    `${API}/api/drivers/me/offers/${ride.id}/accept`,
    { headers: auth(driver) },
  );
  expect(accepted.ok()).toBe(true);
  expect(((await accepted.json()) as { status: string }).status).toBe(
    "ASSIGNED",
  );

  const far = await request.post(`${API}/api/rides`, {
    data: { ...RIDE, pickupLat: -6.0, pickupLng: 106.0 },
    headers: auth(rider),
  });
  const farRide = await far.json();
  let farStatus = "";
  for (let i = 0; i < 20 && farStatus !== "NO_DRIVERS"; i += 1) {
    await new Promise((r) => setTimeout(r, 500));
    const fetched = await request.get(`${API}/api/rides/${farRide.id}`, {
      headers: auth(rider),
    });
    farStatus = ((await fetched.json()) as { status: string }).status;
  }
  expect(farStatus).toBe("NO_DRIVERS");
});
