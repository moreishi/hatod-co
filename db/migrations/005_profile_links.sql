-- 005_profile_links: riders/drivers are profiles of a users account (role driver/rider)
-- Backward-compatible: nullable FKs, no data rewrite. Enforcement moves app-side.
ALTER TABLE riders ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE drivers ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
