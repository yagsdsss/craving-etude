-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Participant" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "groupe" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "sexe" TEXT NOT NULL,
    "sousGroupe" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Participant" ("age", "code", "createdAt", "groupe", "sexe", "sousGroupe") SELECT "age", "code", "createdAt", "groupe", "sexe", "sousGroupe" FROM "Participant";
DROP TABLE "Participant";
ALTER TABLE "new_Participant" RENAME TO "Participant";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
