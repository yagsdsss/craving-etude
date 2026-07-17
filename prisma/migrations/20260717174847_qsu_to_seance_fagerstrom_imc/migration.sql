/*
  Warnings:

  - You are about to drop the column `qsu1` on the `MesureSuivi` table. All the data in the column will be lost.
  - You are about to drop the column `qsu10` on the `MesureSuivi` table. All the data in the column will be lost.
  - You are about to drop the column `qsu2` on the `MesureSuivi` table. All the data in the column will be lost.
  - You are about to drop the column `qsu3` on the `MesureSuivi` table. All the data in the column will be lost.
  - You are about to drop the column `qsu4` on the `MesureSuivi` table. All the data in the column will be lost.
  - You are about to drop the column `qsu5` on the `MesureSuivi` table. All the data in the column will be lost.
  - You are about to drop the column `qsu6` on the `MesureSuivi` table. All the data in the column will be lost.
  - You are about to drop the column `qsu7` on the `MesureSuivi` table. All the data in the column will be lost.
  - You are about to drop the column `qsu8` on the `MesureSuivi` table. All the data in the column will be lost.
  - You are about to drop the column `qsu9` on the `MesureSuivi` table. All the data in the column will be lost.
  - You are about to drop the column `qsuFacteur1` on the `MesureSuivi` table. All the data in the column will be lost.
  - You are about to drop the column `qsuFacteur2` on the `MesureSuivi` table. All the data in the column will be lost.
  - You are about to drop the column `scoreCravingTrait` on the `MesureSuivi` table. All the data in the column will be lost.
  - You are about to drop the column `test6min` on the `MesureSuivi` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MesureSeance" ADD COLUMN "qsu1" INTEGER;
ALTER TABLE "MesureSeance" ADD COLUMN "qsu10" INTEGER;
ALTER TABLE "MesureSeance" ADD COLUMN "qsu2" INTEGER;
ALTER TABLE "MesureSeance" ADD COLUMN "qsu3" INTEGER;
ALTER TABLE "MesureSeance" ADD COLUMN "qsu4" INTEGER;
ALTER TABLE "MesureSeance" ADD COLUMN "qsu5" INTEGER;
ALTER TABLE "MesureSeance" ADD COLUMN "qsu6" INTEGER;
ALTER TABLE "MesureSeance" ADD COLUMN "qsu7" INTEGER;
ALTER TABLE "MesureSeance" ADD COLUMN "qsu8" INTEGER;
ALTER TABLE "MesureSeance" ADD COLUMN "qsu9" INTEGER;
ALTER TABLE "MesureSeance" ADD COLUMN "qsuFacteur1" REAL;
ALTER TABLE "MesureSeance" ADD COLUMN "qsuFacteur2" REAL;
ALTER TABLE "MesureSeance" ADD COLUMN "qsuScoreTotal" REAL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MesureSuivi" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "participantCode" TEXT NOT NULL,
    "temps" TEXT NOT NULL,
    "consoMoyenneSemaine" REAL,
    "poids" REAL,
    "taille" REAL,
    "imc" REAL,
    "tourTaille" REAL,
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
INSERT INTO "new_MesureSuivi" ("capaciteReduireConso", "consoMoyenneSemaine", "createdAt", "envieArreter", "id", "imc", "participantCode", "poids", "scoreFagerstrom", "temps", "tourTaille") SELECT "capaciteReduireConso", "consoMoyenneSemaine", "createdAt", "envieArreter", "id", "imc", "participantCode", "poids", "scoreFagerstrom", "temps", "tourTaille" FROM "MesureSuivi";
DROP TABLE "MesureSuivi";
ALTER TABLE "new_MesureSuivi" RENAME TO "MesureSuivi";
CREATE UNIQUE INDEX "MesureSuivi_participantCode_temps_key" ON "MesureSuivi"("participantCode", "temps");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
