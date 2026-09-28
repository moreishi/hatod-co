-- 008_onboarding: post-approval agency onboarding checklist
-- Ordered steps enforced app-side (see completeStep); rows are the audit trail.
CREATE TABLE onboarding_steps (
  application_id TEXT NOT NULL REFERENCES agency_applications(id) ON DELETE CASCADE,
  step TEXT NOT NULL CHECK (step IN ('docs','fleet','payout','briefing','golive')),
  completed_by TEXT REFERENCES users(id),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (application_id, step)
);
