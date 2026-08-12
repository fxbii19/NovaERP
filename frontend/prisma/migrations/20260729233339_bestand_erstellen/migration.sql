-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Artikel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "artikelnummer" TEXT NOT NULL,
    "produktname" TEXT NOT NULL,
    "suchbegriff" TEXT,
    "bestand" REAL NOT NULL DEFAULT 0,
    "reserviert" REAL NOT NULL DEFAULT 0,
    "verfuegbar" REAL NOT NULL DEFAULT 0,
    "bestellt" REAL NOT NULL DEFAULT 0,
    "inAuftrag" REAL NOT NULL DEFAULT 0,
    "mindestbestand" REAL NOT NULL DEFAULT 0,
    "lagerplatz" TEXT,
    "einheit" TEXT DEFAULT 'Stk',
    "gesperrt" BOOLEAN NOT NULL DEFAULT false,
    "lagerortverwaltung" BOOLEAN NOT NULL DEFAULT true,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" DATETIME NOT NULL
);
INSERT INTO "new_Artikel" ("aktiv", "aktualisiertAm", "artikelnummer", "bestand", "bestellt", "erstelltAm", "id", "inAuftrag", "lagerortverwaltung", "mindestbestand", "produktname", "reserviert", "suchbegriff", "verfuegbar") SELECT "aktiv", "aktualisiertAm", "artikelnummer", "bestand", "bestellt", "erstelltAm", "id", "inAuftrag", "lagerortverwaltung", "mindestbestand", "produktname", "reserviert", "suchbegriff", "verfuegbar" FROM "Artikel";
DROP TABLE "Artikel";
ALTER TABLE "new_Artikel" RENAME TO "Artikel";
CREATE UNIQUE INDEX "Artikel_artikelnummer_key" ON "Artikel"("artikelnummer");
CREATE INDEX "Artikel_artikelnummer_idx" ON "Artikel"("artikelnummer");
CREATE INDEX "Artikel_produktname_idx" ON "Artikel"("produktname");
CREATE INDEX "Artikel_lagerplatz_idx" ON "Artikel"("lagerplatz");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
