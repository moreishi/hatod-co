-- 002_riders: rider accounts (booking gate lives in src/lib/rider.ts)
CREATE TABLE riders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE CHECK (phone <> ''),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE trips ADD COLUMN rider_id TEXT REFERENCES riders(id);

INSERT INTO riders (id, name, phone, status) VALUES
  ('rdr-001', 'R. Garcia', '+639171110011', 'active'),
  ('rdr-002', 'K. Tan', '+639171110022', 'active');
