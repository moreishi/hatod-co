"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { isStaff, type Role } from "@/lib/access";
import { updateZonePricing } from "@/lib/zones";

async function staff() {
  const session = await auth();
  const roles = (session?.user as { roles?: Role[] } | undefined)?.roles ?? [];
  if (!roles.some((r) => isStaff(r))) throw new Error("staff only");
}

export async function updateZonePricingAction(
  id: string,
  pricing: { base: number; perKm: number; perMin: number; minimum: number },
) {
  await staff();
  await updateZonePricing(id, pricing);
  revalidatePath("/zones");
}
