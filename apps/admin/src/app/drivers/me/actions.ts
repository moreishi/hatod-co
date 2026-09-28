"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { isStaff, type Role } from "@/lib/access";
import { getDriverByUser, setDriverStatus } from "@/lib/drivers";
import { acceptOffer, getTrip, setTripStatus } from "@/lib/trips";
import { settleTrip } from "@/lib/wallet";
import { updateDriver } from "@/lib/drivers";
import type { DriverStatus, TripStatus } from "@/lib/types";

/** Driver toggles their own availability. Compliance gate enforced in repo. */
export async function setMyStatusAction(status: DriverStatus) {
  const session = await auth();
  const u = session?.user as { id?: string; roles?: Role[] } | undefined;
  const roles = u?.roles ?? [];
  if (roles.some((r) => isStaff(r))) throw new Error("staff use the fleet panel");
  if (!u?.id) throw new Error("signed in");
  const profile = await getDriverByUser(u.id);
  if (!profile) throw new Error("no driver profile linked to this account");
  await setDriverStatus(profile.id, status);
  revalidatePath("/drivers/me");
}

async function myProfile() {
  const session = await auth();
  const u = session?.user as { id?: string; roles?: Role[] } | undefined;
  const roles = u?.roles ?? [];
  if (roles.some((r) => isStaff(r))) throw new Error("staff use the fleet panel");
  if (!u?.id) throw new Error("signed in");
  const profile = await getDriverByUser(u.id);
  if (!profile) throw new Error("no driver profile linked to this account");
  return profile;
}

/** Advance my own trip — ownership enforced, machine validated in repo. */
export async function advanceTripAction(tripId: string, to: TripStatus) {
  const profile = await myProfile();
  const trip = await getTrip(tripId);
  if (!trip || trip.driverId !== profile.id) throw new Error("not your trip");
  await setTripStatus(tripId, to);
  // Wallet settlement on completion (idempotent — safe on double-click).
  // Unlinked demo trips settle nothing; completion still goes through.
  if (to === "COMPLETED") {
    try {
      await settleTrip(tripId);
    } catch (e) {
      console.warn(`[trips] settle skipped for ${tripId}:`, e instanceof Error ? e.message : e);
    }
  }
  revalidatePath("/drivers/me");
}

/** Claim an open offer from the dispatch pool. */
export async function acceptOfferAction(tripId: string) {
  const profile = await myProfile();
  if (profile.status !== "online") throw new Error("go online first");
  await acceptOffer(tripId, profile.id);
  revalidatePath("/drivers/me");
}

/** Self-service: edit own non-doc profile fields (docs stay agency/ops-only). */
export async function updateMyProfileAction(formData: FormData) {
  const profile = await myProfile();
  await updateDriver(profile.id, {
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    vehicleType: String(formData.get("vehicleType") ?? ""),
    plateNo: String(formData.get("plateNo") ?? ""),
  });
  revalidatePath("/drivers/me");
}
