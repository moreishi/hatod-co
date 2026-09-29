-- 021_agency_area: service area on applications (country/province/city)
-- Existing rows predate the fields: backfill Gensan pilot defaults.
ALTER TABLE agency_applications ADD COLUMN country TEXT NOT NULL DEFAULT 'Philippines';
ALTER TABLE agency_applications ADD COLUMN province TEXT NOT NULL DEFAULT 'South Cotabato';
ALTER TABLE agency_applications ADD COLUMN city TEXT NOT NULL DEFAULT 'General Santos';
