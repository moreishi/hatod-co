-- 003_users: ops team accounts for admin (Auth.js credentials + JWT sessions)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operations'
    CHECK (role IN ('superadmin','operations','finance','support')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prod bootstrap (run on server, never commit a real hash):
--   node -e "console.log(require('node:crypto').scryptSync('CHOOSE-A-STRONG-PASSWORD', require('node:crypto').randomBytes(16), 64).toString('hex'))"
-- then INSERT INTO users (id, name, email, password_hash, role) VALUES
--   ('usr-admin', 'Ops Admin', 'ops@hatod.co', 'scrypt$<salt-hex>$<paste-hash-hex>', 'superadmin');
