"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { isStaff, type Role } from "@/lib/access";
import { setDriverStatus } from "@/lib/drivers";
import type { DriverStatus } from "@/lib/types";

async function staff() {
  const session = await auth();
  const roles = (session?.user as { roles?: Role[] } | undefined)?.roles ?? [];
  if (!roles.some((r) => isStaff(r))) throw new Error("staff only");
}

export async function setOpsDriverStatusAction(id: string, status: DriverStatus) {
  await staff();
  await setDriverStatus(id, status);
  revalidatePath("/drivers");
}
