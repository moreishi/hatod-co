"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { isStaff, type Role } from "@/lib/access";
import { getRiderByUser } from "@/lib/riders";
import { createTrip } from "@/lib/trips";
import { calculateFare } from "@/lib/fare";
import { getBalance } from "@/lib/wallet";
import { listZones } from "@/lib/zones";

async function myRider() {
  const session = await auth();
  const u = session?.user as { id?: string; roles?: Role[] } | undefined;
  const roles = u?.roles ?? [];
  if (roles.some((r) => isStaff(r))) throw new Error("staff use the ops panel");
  if (!u?.id) throw new Error("signed in");
  const profile = await getRiderByUser(u.id);
  if (!profile) throw new Error("no rider profile linked to this account");
  if (profile.status !== "active") throw new Error("rider account suspended");
  return { profile, userId: u.id };
}

/** Self-service booking: server-side fare, wallet pre-check, cash only. */
export async function bookMyTripAction(formData: FormData) {
  const { profile, userId } = await myRider();
  const zoneId = String(formData.get("zoneId") ?? "");
  const zones = await listZones();
  const zone = zones.find((z) => z.id === zoneId);
  if (!zone) throw new Error("unknown zone");
  const distanceM = Number(formData.get("distanceM") ?? 0);
  const durationS = Number(formData.get("durationS") ?? 0);
  const fare = calculateFare({ distanceM, durationS, pricing: zone.pricing });
  const balancePesos = (await getBalance(userId)) / 100;
  if (balancePesos < fare)
    throw new Error(`insufficient wallet (₱${balancePesos.toFixed(2)} < ₱${fare}) — top up at a counter`);
  await createTrip({
    zoneId,
    riderName: profile.name,
    riderId: profile.id,
    pickup: String(formData.get("pickup") ?? "").trim(),
    dropoff: String(formData.get("dropoff") ?? "").trim(),
    distanceM,
    durationS,
    fareQuote: fare,
    payment: "cash",
  });
  revalidatePath("/riders/me");
}
