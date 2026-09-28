-- 019_role_grants: audit trail for profile changes (who gave what to whom)
CREATE TABLE role_grants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  granted BOOLEAN NOT NULL,
  actor_id TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX role_grants_user_idx ON role_grants (user_id);
