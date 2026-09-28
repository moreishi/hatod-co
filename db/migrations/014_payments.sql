-- 014_payments: GCash collection ledger + trip paid flag
-- Append-only: one row per checkout attempt; webhook flips to paid.
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'paymongo',
  amount INT NOT NULL CHECK (amount > 0),
  fee INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed')),
  checkout_id TEXT,
  reference TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX payments_trip_idx ON payments (trip_id);

ALTER TABLE trips ADD COLUMN paid BOOLEAN NOT NULL DEFAULT FALSE;
