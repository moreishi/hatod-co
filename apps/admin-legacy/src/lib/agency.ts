import { insertQuery } from "./repo";
import { paginate } from "./users";
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
    country: String(row.country ?? "Philippines"),
    province: String(row.province ?? ""),
    city: String(row.city ?? ""),
    status: row.status as AgencyStatus,
    createdAt: new Date(row.created_at as string).toISOString(),
    applicantEmail: row.account_email == null ? null : String(row.account_email),
  };
}

export async function listApplications(): Promise<AgencyApplication[]> {
  const rows = await queryDb<Record<string, unknown>>(
    `SELECT a.*, u.email AS account_email FROM agency_applications a
     LEFT JOIN users u ON u.id = a.user_id ORDER BY
     CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC LIMIT 100`,
    [],
  );
  return rows.map(rowToApp);
}

export interface ApplicationPage {
  rows: AgencyApplication[];
  total: number;
  page: number;
  pages: number;
}

const APP_PER_PAGE = 10;

/** Review queue: DB search (business/phone/email/city) + status filter + pagination. */
export async function listApplicationsPaged(
  q = "",
  status = "",
  page = 1,
): Promise<ApplicationPage> {
  const needle = q.trim();
  const like = `%${needle}%`;
  const cleanStatus = ["pending", "approved", "rejected"].includes(status) ? status : "";
  // One value per slot on both dialects.
  const where = `WHERE ($1 = '' OR a.business_name LIKE $2 OR a.contact_phone LIKE $3 OR u.email LIKE $4 OR a.city LIKE $5 OR a.province LIKE $6)
    AND ($7 = '' OR a.status = $8)`;
  const params = [needle, like, like, like, like, like, cleanStatus, cleanStatus];
  const totalRows = await queryDb<{ n: number }>(
    `SELECT COUNT(*) AS n FROM agency_applications a LEFT JOIN users u ON u.id = a.user_id ${where}`,
    params as unknown[],
  );
  const total = Number(totalRows[0]?.n ?? 0);
  const { page: safe, pages, offset, limit } = paginate(total, page, APP_PER_PAGE);
  const rows = await queryDb<Record<string, unknown>>(
    `SELECT a.*, u.email AS account_email FROM agency_applications a
     LEFT JOIN users u ON u.id = a.user_id ${where}
     ORDER BY CASE a.status WHEN 'pending' THEN 0 ELSE 1 END, a.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params as unknown[],
  );
  return { rows: rows.map(rowToApp), total, page: safe, pages };
}

/** One agency's own applications, newest first. */
export async function listMyApplications(userId: string): Promise<AgencyApplication[]> {
  const rows = await queryDb<Record<string, unknown>>(
    `SELECT a.*, u.email AS account_email FROM agency_applications a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE a.user_id = $1 ORDER BY a.created_at DESC`,
    [userId],
  );
  return rows.map(rowToApp);
}

export async function createApplication(
  userId: string,
  input: { businessName: string; contactPhone: string; country?: string | null; province?: string | null; city?: string | null },
): Promise<AgencyApplication> {
  const clean = validateApplication(input);
  const q = insertQuery(
    "agency_applications",
    ["id", "user_id", "business_name", "contact_phone", "country", "province", "city"],
    {
      id: `app-${Date.now()}`,
      user_id: userId,
      business_name: clean.businessName,
      contact_phone: clean.contactPhone,
      country: clean.country,
      province: clean.province,
      city: clean.city,
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
    country: clean.country,
    province: clean.province,
    city: clean.city,
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
