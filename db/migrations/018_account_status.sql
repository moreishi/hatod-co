-- 018_account_status: suspend logins + track last sign-in
ALTER TABLE users ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMPTZ;
