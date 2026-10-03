-- Ride booking extras + dropoff coords + vehicle type, and the agency
-- document-review note. These columns reached the dev databases when their
-- features shipped (SQLite migrations add_dropoff_coords / add_booking_extras /
-- add_sessions era) but were never mirrored as Postgres migrations — caught
-- live when staging seeding hit P2022 (Document.reviewNote). Column shapes
-- mirror `prisma migrate diff --from-empty --to-schema-datamodel` exactly.

-- AlterTable
ALTER TABLE "Ride" ADD COLUMN "pickupLng" DOUBLE PRECISION;
ALTER TABLE "Ride" ADD COLUMN "dropoffLng" DOUBLE PRECISION;
ALTER TABLE "Ride" ADD COLUMN "tipCentavos" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Ride" ADD COLUMN "changeFor" INTEGER;
ALTER TABLE "Ride" ADD COLUMN "riderNote" TEXT DEFAULT '';
ALTER TABLE "Ride" ADD COLUMN "vehicleType" TEXT;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN "reviewNote" TEXT;
