-- 006_user_roles: one user, many profiles (rider + driver at once)
-- Backward-compatible: users.role stays as the legacy primary; user_roles is the set.
CREATE TABLE user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (
    role IN ('superadmin','operations','finance','support','agency','driver','rider')
  ),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

-- Backfill: every existing account keeps its current role as a granted profile.
INSERT INTO user_roles (user_id, role)
SELECT id, role FROM users
ON CONFLICT DO NOTHING;
