-- CreateTable
CREATE TABLE "Participant" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "groupe" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "sexe" TEXT NOT NULL,
    "sousGroupe" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MesureSeance" (
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
    CONSTRAINT "MesureSeance_participantCode_fkey" FOREIGN KEY ("participantCode") REFERENCES "Participant" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CarnetJour" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "participantCode" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "cigarettes" INTEGER,
    "puffPrises" INTEGER,
    "snusSachets" INTEGER,
    "cravingMoyenJour" INTEGER,
    "evenementParticulier" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CarnetJour_participantCode_fkey" FOREIGN KEY ("participantCode") REFERENCES "Participant" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MesureSuivi" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "participantCode" TEXT NOT NULL,
    "temps" TEXT NOT NULL,
    "scoreFagerstrom" INTEGER,
    "scoreCravingTrait" REAL,
    "consoMoyenneSemaine" REAL,
    "test6min" REAL,
    "poids" REAL,
    "imc" REAL,
    "tourTaille" REAL,
    "tauxPresence" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MesureSuivi_participantCode_fkey" FOREIGN KEY ("participantCode") REFERENCES "Participant" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MesureSeance_participantCode_semaine_numeroSeance_key" ON "MesureSeance"("participantCode", "semaine", "numeroSeance");

-- CreateIndex
CREATE UNIQUE INDEX "CarnetJour_participantCode_date_key" ON "CarnetJour"("participantCode", "date");

-- CreateIndex
CREATE UNIQUE INDEX "MesureSuivi_participantCode_temps_key" ON "MesureSuivi"("participantCode", "temps");
