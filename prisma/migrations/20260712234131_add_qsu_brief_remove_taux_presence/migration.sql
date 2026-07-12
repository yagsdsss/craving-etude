/*
  Warnings:

  - You are about to drop the column `tauxPresence` on the `MesureSuivi` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MesureSuivi" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "participantCode" TEXT NOT NULL,
    "temps" TEXT NOT NULL,
    "scoreFagerstrom" INTEGER,
    "consoMoyenneSemaine" REAL,
    "test6min" REAL,
    "poids" REAL,
    "imc" REAL,
    "tourTaille" REAL,
    "envieArreter" INTEGER,
    "capaciteReduireConso" INTEGER,
    "qsu1" INTEGER,
    "qsu2" INTEGER,
    "qsu3" INTEGER,
    "qsu4" INTEGER,
    "qsu5" INTEGER,
    "qsu6" INTEGER,
    "qsu7" INTEGER,
    "qsu8" INTEGER,
    "qsu9" INTEGER,
    "qsu10" INTEGER,
    "scoreCravingTrait" REAL,
    "qsuFacteur1" REAL,
    "qsuFacteur2" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MesureSuivi_participantCode_fkey" FOREIGN KEY ("participantCode") REFERENCES "Participant" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MesureSuivi" ("capaciteReduireConso", "consoMoyenneSemaine", "createdAt", "envieArreter", "id", "imc", "participantCode", "poids", "scoreCravingTrait", "scoreFagerstrom", "temps", "test6min", "tourTaille") SELECT "capaciteReduireConso", "consoMoyenneSemaine", "createdAt", "envieArreter", "id", "imc", "participantCode", "poids", "scoreCravingTrait", "scoreFagerstrom", "temps", "test6min", "tourTaille" FROM "MesureSuivi";
DROP TABLE "MesureSuivi";
ALTER TABLE "new_MesureSuivi" RENAME TO "MesureSuivi";
CREATE UNIQUE INDEX "MesureSuivi_participantCode_temps_key" ON "MesureSuivi"("participantCode", "temps");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
