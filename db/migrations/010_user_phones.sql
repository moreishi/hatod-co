-- 010_user_phones: drivers log in with their PH mobile number
-- Backward-compatible: nullable; existing accounts backfill on first driver-login link.
ALTER TABLE users ADD COLUMN phone TEXT UNIQUE;
