-- 009_fleet_ownership: drivers belong to an agency account (users.id)
-- Backward-compatible: nullable; directly-onboarded drivers keep NULL.
ALTER TABLE drivers ADD COLUMN agency_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX drivers_agency_idx ON drivers (agency_user_id);
