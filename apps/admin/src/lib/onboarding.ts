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
  country: string;
  province: string;
  city: string;
  status: AgencyStatus;
  createdAt: string;
  /** Applicant login identity (joined where available). */
  applicantEmail?: string | null;
}

export interface NewApplication {
  businessName: string;
  contactPhone: string;
  country: string;
  province: string;
  city: string;
}

const nonEmpty = (v: string, label: string): string => {
  const s = v.trim();
  if (!s) throw new Error(`${label} is required`);
  return s;
};

/** A user applies their account for agency (fleet partner) status. */
export function validateApplication(input: {
  businessName: string;
  contactPhone: string;
  country?: string | null;
  province?: string | null;
  city?: string | null;
}): NewApplication {
  const businessName = nonEmpty(input.businessName, "business name");
  let contactPhone: string;
  try {
    contactPhone = normalizePhPhone(input.contactPhone);
  } catch {
    throw new Error("invalid contact phone");
  }
  return {
    businessName,
    contactPhone,
    country: (input.country ?? "").trim() || "Philippines",
    province: nonEmpty(input.province ?? "", "province"),
    city: nonEmpty(input.city ?? "", "city"),
  };
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
  country: z.string().trim().optional().default(""),
  province: z.string().trim().min(1, "province is required"),
  city: z.string().trim().min(1, "city is required"),
});

export type Signup = z.infer<typeof SignupSchema>;

export function validateSignup(input: unknown): Signup & { contactPhone: string; country: string } {
  const parsed = SignupSchema.parse(input);
  let contactPhone: string;
  try {
    contactPhone = normalizePhPhone(parsed.contactPhone);
  } catch {
    throw new Error("invalid contact phone");
  }
  return { ...parsed, contactPhone, country: parsed.country.trim() || "Philippines" };
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
