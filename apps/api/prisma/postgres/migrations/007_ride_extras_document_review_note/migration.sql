-- Ride booking extras + dropoff coords + vehicle type, and the agency
-- document-review note. These columns reached the dev databases when their
-- features shipped (SQLite migrations add_dropoff_coords / add_booking_extras /
-- add_sessions era) but were never mirrored as Postgres migrations — caught
-- live when staging seeding hit P2022 (Document.reviewNote). Column shapes
-- mirror `prisma migrate diff --from-empty --to-schema-datamodel` exactly.
--
-- Written with IF NOT EXISTS: the first prod attempt half-applied (the Ride
-- ALTERs committed, the run died before the Document one), so the migration
-- must no-op on existing columns to converge any state.

-- AlterTable
ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "pickupLng" DOUBLE PRECISION;
ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "dropoffLng" DOUBLE PRECISION;
ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "tipCentavos" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "changeFor" INTEGER;
ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "riderNote" TEXT DEFAULT '';
ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "vehicleType" TEXT;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "reviewNote" TEXT;
