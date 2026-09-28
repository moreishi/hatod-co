"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { isStaff, type Role } from "@/lib/access";
import { acceptOffer, setTripStatus } from "@/lib/trips";
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
