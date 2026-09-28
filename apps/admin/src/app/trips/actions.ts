"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { isStaff, type Role } from "@/lib/access";
import { acceptOffer, createTrip, setTripStatus } from "@/lib/trips";
import { calculateFare } from "@/lib/fare";
import { listZones } from "@/lib/zones";
import type { TripStatus } from "@/lib/types";

async function staff() {
  const session = await auth();
  const roles = (session?.user as { roles?: Role[] } | undefined)?.roles ?? [];
  if (!roles.some((r) => isStaff(r))) throw new Error("staff only");
}

/** Manual dispatch: assign an open trip to a driver (first-come rules apply). */
export async function assignTripAction(tripId: string, driverId: string) {
  await staff();
  if (!driverId) throw new Error("pick a driver");
  await acceptOffer(tripId, driverId);
  revalidatePath("/trips");
}

export async function setTripStatusAction(tripId: string, status: TripStatus) {
  await staff();
  await setTripStatus(tripId, status);
  revalidatePath("/trips");
}

/** Manual trip creation (phone ops): fare quoted server-side from zone pricing. */
export async function createTripAction(formData: FormData) {
  await staff();
  const zoneId = String(formData.get("zoneId") ?? "");
  const zones = await listZones();
  const zone = zones.find((z) => z.id === zoneId);
  if (!zone) throw new Error("unknown zone");
  const distanceM = Number(formData.get("distanceM") ?? 0);
  const durationS = Number(formData.get("durationS") ?? 0);
  await createTrip({
    zoneId,
    riderName: String(formData.get("riderName") ?? "").trim() || "Walk-in rider",
    pickup: String(formData.get("pickup") ?? "").trim(),
    dropoff: String(formData.get("dropoff") ?? "").trim(),
    distanceM,
    durationS,
    fareQuote: calculateFare({ distanceM, durationS, pricing: zone.pricing }),
    payment: "cash",
  });
  revalidatePath("/trips");
}
