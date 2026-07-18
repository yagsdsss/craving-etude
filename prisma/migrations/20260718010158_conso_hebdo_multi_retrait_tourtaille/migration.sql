/*
  Warnings:

  - You are about to drop the column `consoMoyenneSemaine` on the `MesureSuivi` table. All the data in the column will be lost.
  - You are about to drop the column `tourTaille` on the `MesureSuivi` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MesureSuivi" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "participantCode" TEXT NOT NULL,
    "temps" TEXT NOT NULL,
    "consoPuffSemaine" REAL,
    "consoSnusSemaine" REAL,
    "consoCigaretteSemaine" REAL,
    "poids" REAL,
    "taille" REAL,
    "imc" REAL,
    "envieArreter" INTEGER,
    "capaciteReduireConso" INTEGER,
    "fager1" INTEGER,
    "fager2" INTEGER,
    "fager3" INTEGER,
    "fager4" INTEGER,
    "fager5" INTEGER,
    "fager6" INTEGER,
    "scoreFagerstrom" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MesureSuivi_participantCode_fkey" FOREIGN KEY ("participantCode") REFERENCES "Participant" ("code") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MesureSuivi" ("capaciteReduireConso", "createdAt", "envieArreter", "fager1", "fager2", "fager3", "fager4", "fager5", "fager6", "id", "imc", "participantCode", "poids", "scoreFagerstrom", "taille", "temps") SELECT "capaciteReduireConso", "createdAt", "envieArreter", "fager1", "fager2", "fager3", "fager4", "fager5", "fager6", "id", "imc", "participantCode", "poids", "scoreFagerstrom", "taille", "temps" FROM "MesureSuivi";
DROP TABLE "MesureSuivi";
ALTER TABLE "new_MesureSuivi" RENAME TO "MesureSuivi";
CREATE UNIQUE INDEX "MesureSuivi_participantCode_temps_key" ON "MesureSuivi"("participantCode", "temps");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
