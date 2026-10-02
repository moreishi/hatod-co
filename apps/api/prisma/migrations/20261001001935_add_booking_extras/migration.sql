-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Ride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "riderId" TEXT NOT NULL,
    "agencyId" TEXT,
    "driverId" TEXT,
    "vehicleId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "pickupLabel" TEXT NOT NULL,
    "pickupBrgyCode" TEXT NOT NULL,
    "pickupLat" REAL,
    "pickupLng" REAL,
    "dropoffLabel" TEXT NOT NULL,
    "dropoffBrgyCode" TEXT NOT NULL,
    "dropoffLat" REAL,
    "dropoffLng" REAL,
    "distanceKm" REAL,
    "fareCentavos" INTEGER NOT NULL,
    "tipCentavos" INTEGER NOT NULL DEFAULT 0,
    "changeFor" INTEGER,
    "riderNote" TEXT DEFAULT '',
    "vehicleType" TEXT,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "cancelReason" TEXT,
    "acceptedAt" DATETIME,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Ride_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Ride_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Ride" ("acceptedAt", "agencyId", "cancelReason", "completedAt", "createdAt", "distanceKm", "driverId", "dropoffBrgyCode", "dropoffLabel", "dropoffLat", "dropoffLng", "fareCentavos", "id", "paymentMethod", "pickupBrgyCode", "pickupLabel", "pickupLat", "pickupLng", "requestedAt", "riderId", "status", "updatedAt", "vehicleId", "vehicleType") SELECT "acceptedAt", "agencyId", "cancelReason", "completedAt", "createdAt", "distanceKm", "driverId", "dropoffBrgyCode", "dropoffLabel", "dropoffLat", "dropoffLng", "fareCentavos", "id", "paymentMethod", "pickupBrgyCode", "pickupLabel", "pickupLat", "pickupLng", "requestedAt", "riderId", "status", "updatedAt", "vehicleId", "vehicleType" FROM "Ride";
DROP TABLE "Ride";
ALTER TABLE "new_Ride" RENAME TO "Ride";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
