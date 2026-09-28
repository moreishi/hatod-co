"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { canReviewAgency, type Role } from "@/lib/access";
import { decideApplication, completeOnboardingStep } from "@/lib/agency";

async function reviewer() {
  const session = await auth();
  const role = (session?.user as { role?: Role } | undefined)?.role;
  const roles = (session?.user as { roles?: Role[] } | undefined)?.roles ?? [];
  const effective: Role[] = roles.length > 0 ? roles : role ? [role] : [];
  if (!effective.some((r) => canReviewAgency(r))) throw new Error("reviewers only");
  const id = (session?.user as { id?: string } | undefined)?.id ?? "";
  return { id };
}

export async function decideApplicationAction(id: string, decision: "approve" | "reject") {
  const { id: reviewerId } = await reviewer();
  await decideApplication(id, decision, reviewerId);
  revalidatePath("/agency");
}

export async function completeOnboardingAction(applicationId: string, step: string) {
  const { id: reviewerId } = await reviewer();
  await completeOnboardingStep(applicationId, step, reviewerId);
  revalidatePath("/agency");
}
