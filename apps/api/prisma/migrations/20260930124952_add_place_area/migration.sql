-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Place" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'seed',
    "areaKey" TEXT NOT NULL DEFAULT '',
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Place" ("address", "createdAt", "hitCount", "id", "lastUsedAt", "lat", "lng", "name", "providerId", "source") SELECT "address", "createdAt", "hitCount", "id", "lastUsedAt", "lat", "lng", "name", "providerId", "source" FROM "Place";
DROP TABLE "Place";
ALTER TABLE "new_Place" RENAME TO "Place";
CREATE UNIQUE INDEX "Place_providerId_key" ON "Place"("providerId");
CREATE INDEX "Place_name_idx" ON "Place"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
