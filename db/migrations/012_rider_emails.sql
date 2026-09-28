-- 012_rider_emails: optional rider email, unique when present
-- NULLs never collide (Postgres + SQLite both treat NULL as distinct),
-- so many riders can have "no email" while any given address stays unique.
ALTER TABLE riders ADD COLUMN email TEXT UNIQUE;
