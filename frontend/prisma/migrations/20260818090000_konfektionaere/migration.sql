CREATE TABLE "Konfektionaer" (
    "id" SERIAL NOT NULL,
    "nummer" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ansprechpartner" TEXT,
    "email" TEXT,
    "telefon" TEXT,
    "adresse" TEXT,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Konfektionaer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KonfektionaerBestand" (
    "id" SERIAL NOT NULL,
    "konfektionaerId" INTEGER NOT NULL,
    "artikelId" INTEGER NOT NULL,
    "menge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aktualisiertAm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "KonfektionaerBestand_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KonfektionaerSendung" (
    "id" SERIAL NOT NULL,
    "sendungsnummer" TEXT NOT NULL,
    "konfektionaerId" INTEGER NOT NULL,
    "artikelId" INTEGER NOT NULL,
    "menge" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ZUR_FREIGABE',
    "freigegebenVon" TEXT,
    "freigegebenAm" TIMESTAMP(3),
    "versandtVon" TEXT,
    "versandtAm" TIMESTAMP(3),
    "rueckmeldeMenge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ausschussMenge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notiz" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "abgeschlossenAm" TIMESTAMP(3),
    CONSTRAINT "KonfektionaerSendung_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Konfektionaer_nummer_key" ON "Konfektionaer"("nummer");
CREATE INDEX "Konfektionaer_name_idx" ON "Konfektionaer"("name");
CREATE UNIQUE INDEX "KonfektionaerBestand_konfektionaerId_artikelId_key" ON "KonfektionaerBestand"("konfektionaerId", "artikelId");
CREATE UNIQUE INDEX "KonfektionaerSendung_sendungsnummer_key" ON "KonfektionaerSendung"("sendungsnummer");
CREATE INDEX "KonfektionaerSendung_status_idx" ON "KonfektionaerSendung"("status");

ALTER TABLE "KonfektionaerBestand" ADD CONSTRAINT "KonfektionaerBestand_konfektionaerId_fkey" FOREIGN KEY ("konfektionaerId") REFERENCES "Konfektionaer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KonfektionaerBestand" ADD CONSTRAINT "KonfektionaerBestand_artikelId_fkey" FOREIGN KEY ("artikelId") REFERENCES "Artikel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KonfektionaerSendung" ADD CONSTRAINT "KonfektionaerSendung_konfektionaerId_fkey" FOREIGN KEY ("konfektionaerId") REFERENCES "Konfektionaer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KonfektionaerSendung" ADD CONSTRAINT "KonfektionaerSendung_artikelId_fkey" FOREIGN KEY ("artikelId") REFERENCES "Artikel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
