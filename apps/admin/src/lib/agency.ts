import { insertQuery } from "./repo";
import { queryDb } from "./db";
import {
  ONBOARDING_STEPS,
  completeStep,
  reviewApplication,
  validateApplication,
  validateSignup,
  type AgencyApplication,
  type AgencyStatus,
  type OnboardingState,
  type OnboardingStep,
} from "./onboarding";

export {
  ONBOARDING_STEPS,
  STEP_LABELS,
  canGoLive,
  completeStep,
  reviewApplication,
  validateApplication,
  validateSignup,
  type AgencyApplication,
  type AgencyStatus,
  type NewApplication,
  type OnboardingState,
  type OnboardingStep,
  type Signup,
} from "./onboarding";

function rowToApp(row: Record<string, unknown>): AgencyApplication {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    businessName: String(row.business_name),
    contactPhone: String(row.contact_phone),
    status: row.status as AgencyStatus,
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

export async function listApplications(): Promise<AgencyApplication[]> {
  const rows = await queryDb<Record<string, unknown>>(
    `SELECT * FROM agency_applications ORDER BY
     CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC`,
    [],
  );
  return rows.map(rowToApp);
}

export async function createApplication(
  userId: string,
  input: { businessName: string; contactPhone: string },
): Promise<AgencyApplication> {
  const clean = validateApplication(input);
  const q = insertQuery(
    "agency_applications",
    ["id", "user_id", "business_name", "contact_phone"],
    {
      id: `app-${Date.now()}`,
      user_id: userId,
      business_name: clean.businessName,
      contact_phone: clean.contactPhone,
    },
  );
  const rows = await queryDb<Record<string, unknown>>(q.text, q.values);
  return rowToApp(rows[0]);
}
/** Decide + (on approve) grant the agency profile. Reviewer must be staff-checked upstream. */
export async function decideApplication(
  id: string,
  decision: "approve" | "reject",
  reviewerId: string,
): Promise<AgencyApplication> {
  const [row] = await queryDb<Record<string, unknown>>(
    "SELECT * FROM agency_applications WHERE id = $1",
    [id],
  );
  if (!row) throw new Error("application not found");
  const decided = reviewApplication(rowToApp(row), decision);
  await queryDb(
    "UPDATE agency_applications SET status = $1, decided_by = $2, decided_at = CURRENT_TIMESTAMP WHERE id = $3",
    [decided.status, reviewerId, id],
  );
  if (decision === "approve") {
    const gq = insertQuery("user_roles", ["user_id", "role"], {
      user_id: decided.userId,
      role: "agency",
    });
    await queryDb(`${gq.text} ON CONFLICT DO NOTHING`, gq.values);
  }
  return decided;
}

// --- Public signup ----------------------------------------------------------

/** Self-signup: account starts as rider (OTP login on the contact phone). */
export async function signupAgency(input: unknown): Promise<{ applicationId: string }> {
  const clean = validateSignup(input);
  const existing = await queryDb<Record<string, unknown>>(
    "SELECT id FROM users WHERE email = $1",
    [clean.email],
  );
  if (existing.length > 0) throw new Error("email already registered");
  const userId = `usr-${Date.now()}`;
  const uq = insertQuery("users", ["id", "name", "email", "phone", "password_hash", "role"], {
    id: userId,
    name: clean.name,
    email: clean.email,
    phone: clean.contactPhone,
    password_hash: "otp-only",
    role: "rider",
  });
  await queryDb(uq.text, uq.values);
  const rq = insertQuery("user_roles", ["user_id", "role"], { user_id: userId, role: "rider" });
  await queryDb(rq.text, rq.values);
  const app = await createApplication(userId, {
    businessName: clean.businessName,
    contactPhone: clean.contactPhone,
  });
  return { applicationId: app.id };
}

export async function listApplicationsByEmail(email: string): Promise<AgencyApplication[]> {
  const rows = await queryDb<Record<string, unknown>>(
    `SELECT a.* FROM agency_applications a JOIN users u ON u.id = a.user_id
     WHERE u.email = $1 ORDER BY a.created_at DESC`,
    [email.trim().toLowerCase()],
  );
  return rows.map(rowToApp);
}

// --- Onboarding tracker (ordered machine lives in ./onboarding) ------------

export async function getOnboarding(applicationId: string): Promise<OnboardingState> {
  const rows = await queryDb<{ step: string }>(
    "SELECT step FROM onboarding_steps WHERE application_id = $1",
    [applicationId],
  );
  const done = rows
    .map((r) => r.step)
    .filter((s): s is OnboardingStep =>
      (ONBOARDING_STEPS as readonly string[]).includes(s),
    );
  return { applicationId, done };
}

export async function completeOnboardingStep(
  applicationId: string,
  step: string,
  actorId: string,
): Promise<OnboardingState> {
  const current = await getOnboarding(applicationId);
  const next = completeStep(current, step);
  const q = insertQuery(
    "onboarding_steps",
    ["application_id", "step", "completed_by"],
    { application_id: applicationId, step, completed_by: actorId },
  );
  await queryDb(q.text, q.values);
  return next;
}
