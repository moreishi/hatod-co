-- 013_payouts: agency payout ledger (append-only, one row per payment)
CREATE TABLE payouts (
  id TEXT PRIMARY KEY,
  agency_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  amount INT NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','void')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX payouts_agency_idx ON payouts (agency_user_id);
