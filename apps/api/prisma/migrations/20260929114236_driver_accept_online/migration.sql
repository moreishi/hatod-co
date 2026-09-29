-- AlterTable
ALTER TABLE "Ride" ADD COLUMN "acceptedAt" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Driver" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPLICANT',
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "licenseNo" TEXT,
    "dateOfBirth" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Driver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Driver_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Driver" ("agencyId", "createdAt", "dateOfBirth", "id", "licenseNo", "status", "updatedAt", "userId") SELECT "agencyId", "createdAt", "dateOfBirth", "id", "licenseNo", "status", "updatedAt", "userId" FROM "Driver";
DROP TABLE "Driver";
ALTER TABLE "new_Driver" RENAME TO "Driver";
CREATE UNIQUE INDEX "Driver_userId_key" ON "Driver"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
