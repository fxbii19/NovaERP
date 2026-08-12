-- CreateTable
CREATE TABLE "Artikel" (
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
    "lagerortverwaltung" BOOLEAN NOT NULL DEFAULT true,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Artikel_artikelnummer_key" ON "Artikel"("artikelnummer");
