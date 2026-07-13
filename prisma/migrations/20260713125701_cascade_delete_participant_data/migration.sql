-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CarnetJour" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "participantCode" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "cigarettes" INTEGER,
    "puffPrises" INTEGER,
    "snusSachets" INTEGER,
    "cravingMoyenJour" INTEGER,
    "evenementParticulier" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CarnetJour_participantCode_fkey" FOREIGN KEY ("participantCode") REFERENCES "Participant" ("code") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CarnetJour" ("cigarettes", "cravingMoyenJour", "createdAt", "date", "evenementParticulier", "id", "participantCode", "puffPrises", "snusSachets") SELECT "cigarettes", "cravingMoyenJour", "createdAt", "date", "evenementParticulier", "id", "participantCode", "puffPrises", "snusSachets" FROM "CarnetJour";
DROP TABLE "CarnetJour";
ALTER TABLE "new_CarnetJour" RENAME TO "CarnetJour";
CREATE UNIQUE INDEX "CarnetJour_participantCode_date_key" ON "CarnetJour"("participantCode", "date");
CREATE TABLE "new_MesureSeance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "participantCode" TEXT NOT NULL,
    "semaine" INTEGER NOT NULL,
    "numeroSeance" INTEGER NOT NULL,
    "modalite" TEXT NOT NULL,
    "ordre" TEXT NOT NULL,
    "heureDebut" DATETIME,
    "cravingAvant" INTEGER,
    "cravingApres" INTEGER,
    "deltaCraving" INTEGER,
    "rpeReel" INTEGER,
    "heuresDepuisDerniereConso" REAL,
    "remarque" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MesureSeance_participantCode_fkey" FOREIGN KEY ("participantCode") REFERENCES "Participant" ("code") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MesureSeance" ("cravingApres", "cravingAvant", "createdAt", "deltaCraving", "heureDebut", "heuresDepuisDerniereConso", "id", "modalite", "numeroSeance", "ordre", "participantCode", "remarque", "rpeReel", "semaine") SELECT "cravingApres", "cravingAvant", "createdAt", "deltaCraving", "heureDebut", "heuresDepuisDerniereConso", "id", "modalite", "numeroSeance", "ordre", "participantCode", "remarque", "rpeReel", "semaine" FROM "MesureSeance";
DROP TABLE "MesureSeance";
ALTER TABLE "new_MesureSeance" RENAME TO "MesureSeance";
CREATE UNIQUE INDEX "MesureSeance_participantCode_semaine_numeroSeance_key" ON "MesureSeance"("participantCode", "semaine", "numeroSeance");
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
    CONSTRAINT "MesureSuivi_participantCode_fkey" FOREIGN KEY ("participantCode") REFERENCES "Participant" ("code") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MesureSuivi" ("capaciteReduireConso", "consoMoyenneSemaine", "createdAt", "envieArreter", "id", "imc", "participantCode", "poids", "qsu1", "qsu10", "qsu2", "qsu3", "qsu4", "qsu5", "qsu6", "qsu7", "qsu8", "qsu9", "qsuFacteur1", "qsuFacteur2", "scoreCravingTrait", "scoreFagerstrom", "temps", "test6min", "tourTaille") SELECT "capaciteReduireConso", "consoMoyenneSemaine", "createdAt", "envieArreter", "id", "imc", "participantCode", "poids", "qsu1", "qsu10", "qsu2", "qsu3", "qsu4", "qsu5", "qsu6", "qsu7", "qsu8", "qsu9", "qsuFacteur1", "qsuFacteur2", "scoreCravingTrait", "scoreFagerstrom", "temps", "test6min", "tourTaille" FROM "MesureSuivi";
DROP TABLE "MesureSuivi";
ALTER TABLE "new_MesureSuivi" RENAME TO "MesureSuivi";
CREATE UNIQUE INDEX "MesureSuivi_participantCode_temps_key" ON "MesureSuivi"("participantCode", "temps");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
