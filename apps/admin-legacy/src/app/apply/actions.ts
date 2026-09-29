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
    country: String(formData.get("country") ?? ""),
    province: String(formData.get("province") ?? ""),
    city: String(formData.get("city") ?? ""),
  });
  redirect(`/apply/done?id=${applicationId}`);
}
