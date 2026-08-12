-- CreateTable
CREATE TABLE "Bestellung" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bestellnummer" TEXT NOT NULL,
    "lieferant" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Offen',
    "gesamtpositionen" INTEGER NOT NULL DEFAULT 0,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Bestellung_bestellnummer_key" ON "Bestellung"("bestellnummer");
