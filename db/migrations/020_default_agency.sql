-- 020_default_agency: every driver has an owner; orphans go to Hatod Direct
-- System account (never signs in — OTP codes are never issued for it).
INSERT INTO users (id, name, email, phone, password_hash, role)
VALUES ('usr-agency-default', 'Hatod Direct', 'direct@hatod.co', '+639000000000', 'otp-only', 'agency')
ON CONFLICT (id) DO NOTHING;
INSERT INTO user_roles (user_id, role) VALUES ('usr-agency-default', 'agency')
ON CONFLICT DO NOTHING;

UPDATE drivers SET agency_user_id = 'usr-agency-default' WHERE agency_user_id IS NULL;
