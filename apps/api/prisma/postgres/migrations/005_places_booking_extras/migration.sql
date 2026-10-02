-- AlterTable
ALTER TABLE "Ride" ADD COLUMN "dropoffLat" DOUBLE PRECISION,
ADD COLUMN "dropoffLng" DOUBLE PRECISION,
ADD COLUMN "tipCentavos" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "changeFor" INTEGER,
ADD COLUMN "riderNote" TEXT DEFAULT '';

-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'seed',
    "areaKey" TEXT NOT NULL DEFAULT '',
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Place_providerId_key" ON "Place"("providerId");
CREATE INDEX "Place_name_idx" ON "Place"("name");
