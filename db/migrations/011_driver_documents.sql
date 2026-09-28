-- 011_driver_documents: renewable per-requirement uploads with verification
-- Renewals are new rows; latest verified per (driver_id, type) wins app-side.
CREATE TABLE driver_documents (
  id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('license','or_cr','nbi','pnp','insurance','vehicle_photo')),
  file_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
  expiry_date DATE,
  verified_by TEXT REFERENCES users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX driver_documents_driver_idx ON driver_documents (driver_id, type);
