import { z } from "zod";
import { normalizePhPhone } from "./phone";

// Pure domain logic (client- + edge-safe): no node:* / DB imports here.
// Repository functions live in ./agency (server-only).

export type AgencyStatus = "pending" | "approved" | "rejected";

export interface AgencyApplication {
  id: string;
  userId: string;
  businessName: string;
  contactPhone: string;
  status: AgencyStatus;
  createdAt: string;
}

export interface NewApplication {
  businessName: string;
  contactPhone: string;
}

/** A user applies their account for agency (fleet partner) status. */
export function validateApplication(input: {
  businessName: string;
  contactPhone: string;
}): NewApplication {
  const businessName = input.businessName.trim();
  if (!businessName) throw new Error("business name is required");
  let contactPhone: string;
  try {
    contactPhone = normalizePhPhone(input.contactPhone);
  } catch {
    throw new Error("invalid contact phone");
  }
  return { businessName, contactPhone };
}

/** Review state machine — only pending applications are decidable. */
export function reviewApplication(
  app: AgencyApplication,
  decision: "approve" | "reject",
): AgencyApplication {
  if (app.status !== "pending") throw new Error("only pending applications can be reviewed");
  return { ...app, status: decision === "approve" ? "approved" : "rejected" };
}

export const SignupSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  email: z.string().trim().toLowerCase().email("invalid email"),
  businessName: z.string().trim().min(1, "business name is required"),
  contactPhone: z.string().trim().min(1, "contact phone is required"),
});

export type Signup = z.infer<typeof SignupSchema>;

export function validateSignup(input: unknown): Signup & { contactPhone: string } {
  const parsed = SignupSchema.parse(input);
  let contactPhone: string;
  try {
    contactPhone = normalizePhPhone(parsed.contactPhone);
  } catch {
    throw new Error("invalid contact phone");
  }
  return { ...parsed, contactPhone };
}

export const ONBOARDING_STEPS = ["docs", "fleet", "payout", "briefing", "golive"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const STEP_LABELS: Record<OnboardingStep, string> = {
  docs: "Business documents verified",
  fleet: "First driver + vehicle added",
  payout: "Payout channel set up",
  briefing: "Ops briefing completed",
  golive: "Go-live approval",
};

export interface OnboardingState {
  applicationId: string;
  done: OnboardingStep[];
}

/** Ordered machine: each step unlocks only after the previous one. */
export function completeStep(state: OnboardingState, step: string): OnboardingState {
  if (!(ONBOARDING_STEPS as readonly string[]).includes(step))
    throw new Error(`unknown onboarding step: ${step}`);
  const s = step as OnboardingStep;
  if (state.done.includes(s)) throw new Error(`${s} already completed`);
  const next = ONBOARDING_STEPS.find((x) => !state.done.includes(x));
  if (s !== next) throw new Error(`complete ${next} first`);
  return { ...state, done: [...state.done, s] };
}

export function canGoLive(state: OnboardingState): boolean {
  return ONBOARDING_STEPS.every((s) => state.done.includes(s));
}
