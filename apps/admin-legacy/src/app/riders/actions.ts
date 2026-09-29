"use server";

import { revalidatePath } from "next/cache";
import { createRider, deleteRider, setRiderStatus } from "@/lib/riders";
import type { RiderStatus } from "@/lib/types";

export async function createRiderAction(formData: FormData) {
  await createRider({
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? "") || null,
  });
  revalidatePath("/riders");
}

export async function setRiderStatusAction(id: string, status: RiderStatus) {
  await setRiderStatus(id, status);
  revalidatePath("/riders");
}

export async function deleteRiderAction(id: string) {
  await deleteRider(id);
  revalidatePath("/riders");
}
