"use server";

import { redirect } from "next/navigation";
import { signupAgency } from "@/lib/agency";

export async function signupAgencyAction(formData: FormData) {
  // Public endpoint (see proxy allowlist): validate hard, throttle later.
  const { applicationId } = await signupAgency({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    businessName: String(formData.get("businessName") ?? ""),
    contactPhone: String(formData.get("contactPhone") ?? ""),
  });
  redirect(`/apply/done?id=${applicationId}`);
}
