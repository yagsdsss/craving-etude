/*
  Warnings:

  - You are about to drop the column `puffPrises` on the `CarnetJour` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CarnetJour" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "participantCode" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "cigarettes" INTEGER,
    "puffPourcentage" INTEGER,
    "snusSachets" INTEGER,
    "cravingMoyenJour" INTEGER,
    "evenementParticulier" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CarnetJour_participantCode_fkey" FOREIGN KEY ("participantCode") REFERENCES "Participant" ("code") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CarnetJour" ("cigarettes", "cravingMoyenJour", "createdAt", "date", "evenementParticulier", "id", "participantCode", "snusSachets") SELECT "cigarettes", "cravingMoyenJour", "createdAt", "date", "evenementParticulier", "id", "participantCode", "snusSachets" FROM "CarnetJour";
DROP TABLE "CarnetJour";
ALTER TABLE "new_CarnetJour" RENAME TO "CarnetJour";
CREATE UNIQUE INDEX "CarnetJour_participantCode_date_key" ON "CarnetJour"("participantCode", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
