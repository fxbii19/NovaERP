-- CreateTable
CREATE TABLE "Artikel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "artikelnummer" TEXT NOT NULL,
    "produktname" TEXT NOT NULL,
    "suchbegriff" TEXT,
    "groesse" TEXT,
    "variante" TEXT,
    "bestand" REAL NOT NULL DEFAULT 0,
    "reserviert" REAL NOT NULL DEFAULT 0,
    "verfuegbar" REAL NOT NULL DEFAULT 0,
    "bestellt" REAL NOT NULL DEFAULT 0,
    "inAuftrag" REAL NOT NULL DEFAULT 0,
    "mindestbestand" REAL NOT NULL DEFAULT 0,
    "verkaufspreis" REAL NOT NULL DEFAULT 0,
    "lagerplatz" TEXT,
    "einheit" TEXT DEFAULT 'Stk',
    "gesperrt" BOOLEAN NOT NULL DEFAULT false,
    "lagerortverwaltung" BOOLEAN NOT NULL DEFAULT true,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Lagerplatz" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "bereich" TEXT NOT NULL,
    "typ" TEXT NOT NULL DEFAULT 'REGAL',
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Lagerbestand" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "artikelId" INTEGER NOT NULL,
    "lagerplatzId" INTEGER NOT NULL,
    "menge" REAL NOT NULL DEFAULT 0,
    "aktualisiertAm" DATETIME NOT NULL,
    CONSTRAINT "Lagerbestand_artikelId_fkey" FOREIGN KEY ("artikelId") REFERENCES "Artikel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Lagerbestand_lagerplatzId_fkey" FOREIGN KEY ("lagerplatzId") REFERENCES "Lagerplatz" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lagerbewegung" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "typ" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ERFASST',
    "artikelId" INTEGER NOT NULL,
    "menge" REAL NOT NULL,
    "vonLagerplatzId" INTEGER,
    "nachLagerplatzId" INTEGER,
    "lieferscheinnummer" TEXT,
    "ladungstraegerCode" TEXT,
    "notiz" TEXT,
    "erfasstVon" TEXT,
    "bestaetigtVon" TEXT,
    "erfasstAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bestaetigtAm" DATETIME,
    CONSTRAINT "Lagerbewegung_artikelId_fkey" FOREIGN KEY ("artikelId") REFERENCES "Artikel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Lagerbewegung_vonLagerplatzId_fkey" FOREIGN KEY ("vonLagerplatzId") REFERENCES "Lagerplatz" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lagerbewegung_nachLagerplatzId_fkey" FOREIGN KEY ("nachLagerplatzId") REFERENCES "Lagerplatz" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ladungstraeger" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "barcode" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "lagerplatzId" INTEGER,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" DATETIME NOT NULL,
    CONSTRAINT "Ladungstraeger_lagerplatzId_fkey" FOREIGN KEY ("lagerplatzId") REFERENCES "Lagerplatz" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LadungstraegerPosition" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ladungstraegerId" INTEGER NOT NULL,
    "artikelId" INTEGER NOT NULL,
    "menge" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "LadungstraegerPosition_ladungstraegerId_fkey" FOREIGN KEY ("ladungstraegerId") REFERENCES "Ladungstraeger" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LadungstraegerPosition_artikelId_fkey" FOREIGN KEY ("artikelId") REFERENCES "Artikel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventurPosition" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lagerplatzId" INTEGER NOT NULL,
    "artikelId" INTEGER NOT NULL,
    "sollMenge" REAL NOT NULL,
    "istMenge" REAL NOT NULL,
    "differenz" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OFFEN',
    "gezaehltVon" TEXT,
    "gebuchtVon" TEXT,
    "gezaehltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gebuchtAm" DATETIME,
    CONSTRAINT "InventurPosition_lagerplatzId_fkey" FOREIGN KEY ("lagerplatzId") REFERENCES "Lagerplatz" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InventurPosition_artikelId_fkey" FOREIGN KEY ("artikelId") REFERENCES "Artikel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pruefauftrag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pruefnummer" TEXT NOT NULL,
    "artikelId" INTEGER NOT NULL,
    "lagerplatzId" INTEGER,
    "typ" TEXT NOT NULL DEFAULT 'EINGANGSPRUEFUNG',
    "status" TEXT NOT NULL DEFAULT 'OFFEN',
    "prioritaet" TEXT NOT NULL DEFAULT 'NORMAL',
    "pruefmenge" REAL NOT NULL,
    "auftraggeber" TEXT,
    "zugewiesenAn" TEXT,
    "notiz" TEXT,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "faelligAm" DATETIME,
    "abgeschlossenAm" DATETIME,
    CONSTRAINT "Pruefauftrag_artikelId_fkey" FOREIGN KEY ("artikelId") REFERENCES "Artikel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pruefauftrag_lagerplatzId_fkey" FOREIGN KEY ("lagerplatzId") REFERENCES "Lagerplatz" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Qualitaetspruefung" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pruefauftragId" INTEGER NOT NULL,
    "ergebnis" TEXT NOT NULL,
    "gutMenge" REAL NOT NULL,
    "fehlerMenge" REAL NOT NULL,
    "fehlerart" TEXT,
    "schweregrad" TEXT,
    "bemerkung" TEXT,
    "geprueftVon" TEXT,
    "geprueftAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Qualitaetspruefung_pruefauftragId_fkey" FOREIGN KEY ("pruefauftragId") REFERENCES "Pruefauftrag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Qualitaetsfreigabe" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pruefungId" INTEGER NOT NULL,
    "entscheidung" TEXT NOT NULL,
    "begruendung" TEXT,
    "entschiedenVon" TEXT,
    "entschiedenAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Qualitaetsfreigabe_pruefungId_fkey" FOREIGN KEY ("pruefungId") REFERENCES "Qualitaetspruefung" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sperrbestand" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "artikelId" INTEGER NOT NULL,
    "lagerplatzId" INTEGER,
    "pruefungId" INTEGER,
    "menge" REAL NOT NULL,
    "grund" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GESPERRT',
    "gesperrtVon" TEXT,
    "freigegebenVon" TEXT,
    "gesperrtAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "freigegebenAm" DATETIME,
    CONSTRAINT "Sperrbestand_artikelId_fkey" FOREIGN KEY ("artikelId") REFERENCES "Artikel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Sperrbestand_lagerplatzId_fkey" FOREIGN KEY ("lagerplatzId") REFERENCES "Lagerplatz" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sperrbestand_pruefungId_fkey" FOREIGN KEY ("pruefungId") REFERENCES "Qualitaetspruefung" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Konfektionsauftrag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "auftragsnummer" TEXT NOT NULL,
    "artikelId" INTEGER NOT NULL,
    "vonLagerplatzId" INTEGER,
    "nachLagerplatzId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'OFFEN',
    "arbeitsschritt" TEXT NOT NULL,
    "sollMenge" REAL NOT NULL,
    "istMenge" REAL NOT NULL DEFAULT 0,
    "ausschussMenge" REAL NOT NULL DEFAULT 0,
    "bearbeiter" TEXT,
    "notiz" TEXT,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gestartetAm" DATETIME,
    "abgeschlossenAm" DATETIME,
    CONSTRAINT "Konfektionsauftrag_artikelId_fkey" FOREIGN KEY ("artikelId") REFERENCES "Artikel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Konfektionsauftrag_vonLagerplatzId_fkey" FOREIGN KEY ("vonLagerplatzId") REFERENCES "Lagerplatz" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Konfektionsauftrag_nachLagerplatzId_fkey" FOREIGN KEY ("nachLagerplatzId") REFERENCES "Lagerplatz" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Logistikauftrag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "auftragsnummer" TEXT NOT NULL,
    "kunde" TEXT NOT NULL,
    "kundenreferenz" TEXT,
    "lieferadresse" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OFFEN',
    "prioritaet" TEXT NOT NULL DEFAULT 'NORMAL',
    "liefertermin" DATETIME,
    "notiz" TEXT,
    "erstelltVon" TEXT,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Logistikposition" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "auftragId" INTEGER NOT NULL,
    "artikelId" INTEGER NOT NULL,
    "menge" REAL NOT NULL,
    "einzelpreis" REAL NOT NULL DEFAULT 0,
    "kommissionierteMenge" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "Logistikposition_auftragId_fkey" FOREIGN KEY ("auftragId") REFERENCES "Logistikauftrag" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Logistikposition_artikelId_fkey" FOREIGN KEY ("artikelId") REFERENCES "Artikel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Kommissionierung" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kommissioniernummer" TEXT NOT NULL,
    "auftragId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OFFEN',
    "bearbeiter" TEXT,
    "gestartetAm" DATETIME,
    "abgeschlossenAm" DATETIME,
    "notiz" TEXT,
    CONSTRAINT "Kommissionierung_auftragId_fkey" FOREIGN KEY ("auftragId") REFERENCES "Logistikauftrag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ladung" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ladungsnummer" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GEPLANT',
    "spediteur" TEXT,
    "kennzeichen" TEXT,
    "rampe" TEXT,
    "abfahrt" DATETIME,
    "ziel" TEXT,
    "erstelltVon" TEXT,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Ladungsauftrag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ladungId" INTEGER NOT NULL,
    "auftragId" INTEGER NOT NULL,
    CONSTRAINT "Ladungsauftrag_ladungId_fkey" FOREIGN KEY ("ladungId") REFERENCES "Ladung" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Ladungsauftrag_auftragId_fkey" FOREIGN KEY ("auftragId") REFERENCES "Logistikauftrag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Versand" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "versandnummer" TEXT NOT NULL,
    "auftragId" INTEGER NOT NULL,
    "ladungId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'BEREIT',
    "versandart" TEXT,
    "trackingnummer" TEXT,
    "warenwert" REAL NOT NULL DEFAULT 0,
    "bezahlt" BOOLEAN NOT NULL DEFAULT false,
    "bezahltVon" TEXT,
    "bezahltAm" DATETIME,
    "versendetVon" TEXT,
    "versendetAm" DATETIME,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Versand_auftragId_fkey" FOREIGN KEY ("auftragId") REFERENCES "Logistikauftrag" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Versand_ladungId_fkey" FOREIGN KEY ("ladungId") REFERENCES "Ladung" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Desadv" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "desadvnummer" TEXT NOT NULL,
    "versandId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ERSTELLT',
    "empfaenger" TEXT,
    "gesendetVon" TEXT,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gesendetAm" DATETIME,
    CONSTRAINT "Desadv_versandId_fkey" FOREIGN KEY ("versandId") REFERENCES "Versand" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lieferschein" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lieferscheinnummer" TEXT NOT NULL,
    "versandId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ERSTELLT',
    "bemerkung" TEXT,
    "erstelltVon" TEXT,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Lieferschein_versandId_fkey" FOREIGN KEY ("versandId") REFERENCES "Versand" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Rollenprofil" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "beschreibung" TEXT,
    "rechteJson" TEXT NOT NULL,
    "systemrolle" BOOLEAN NOT NULL DEFAULT false,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Benutzer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "personalnummer" TEXT NOT NULL,
    "vorname" TEXT NOT NULL,
    "nachname" TEXT NOT NULL,
    "passwortHash" TEXT NOT NULL,
    "abteilung" TEXT NOT NULL,
    "rollenprofilCode" TEXT NOT NULL,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "letzteAnmeldungAm" DATETIME,
    "letzteMotivationAm" DATETIME,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" DATETIME NOT NULL,
    CONSTRAINT "Benutzer_rollenprofilCode_fkey" FOREIGN KEY ("rollenprofilCode") REFERENCES "Rollenprofil" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MitarbeiterAufgabe" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titel" TEXT NOT NULL,
    "beschreibung" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OFFEN',
    "prioritaet" TEXT NOT NULL DEFAULT 'NORMAL',
    "faelligAm" DATETIME,
    "benutzerId" INTEGER NOT NULL,
    "erstelltVon" TEXT,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" DATETIME NOT NULL,
    CONSTRAINT "MitarbeiterAufgabe_benutzerId_fkey" FOREIGN KEY ("benutzerId") REFERENCES "Benutzer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Mitarbeiterschicht" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "benutzerId" INTEGER NOT NULL,
    "datum" DATETIME NOT NULL,
    "startzeit" TEXT NOT NULL,
    "endzeit" TEXT NOT NULL,
    "bereich" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GEPLANT',
    "notiz" TEXT,
    "erstelltVon" TEXT,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" DATETIME NOT NULL,
    CONSTRAINT "Mitarbeiterschicht_benutzerId_fkey" FOREIGN KEY ("benutzerId") REFERENCES "Benutzer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DigitalerArbeitsauftrag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nummer" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "beschreibung" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OFFEN',
    "prioritaet" TEXT NOT NULL DEFAULT 'NORMAL',
    "faelligAm" DATETIME,
    "benutzerId" INTEGER NOT NULL,
    "erstelltVon" TEXT,
    "begonnenAm" DATETIME,
    "abgeschlossenAm" DATETIME,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" DATETIME NOT NULL,
    CONSTRAINT "DigitalerArbeitsauftrag_benutzerId_fkey" FOREIGN KEY ("benutzerId") REFERENCES "Benutzer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InterneBenachrichtigung" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titel" TEXT NOT NULL,
    "nachricht" TEXT NOT NULL,
    "typ" TEXT NOT NULL DEFAULT 'INFO',
    "gelesen" BOOLEAN NOT NULL DEFAULT false,
    "benutzerId" INTEGER NOT NULL,
    "erstelltVon" TEXT,
    "gelesenAm" DATETIME,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InterneBenachrichtigung_benutzerId_fkey" FOREIGN KEY ("benutzerId") REFERENCES "Benutzer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrganisationTermin" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titel" TEXT NOT NULL,
    "beschreibung" TEXT,
    "typ" TEXT NOT NULL DEFAULT 'TERMIN',
    "sichtbarkeit" TEXT NOT NULL DEFAULT 'PERSOENLICH',
    "startAm" DATETIME NOT NULL,
    "endeAm" DATETIME NOT NULL,
    "ort" TEXT,
    "organisiertVon" TEXT NOT NULL,
    "organisatorId" INTEGER NOT NULL,
    "teilnehmerJson" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'GEPLANT',
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OrganisationRessource" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "kategorie" TEXT NOT NULL,
    "standort" TEXT,
    "beschreibung" TEXT,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RessourcenReservierung" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ressourceId" INTEGER NOT NULL,
    "titel" TEXT NOT NULL,
    "startAm" DATETIME NOT NULL,
    "endeAm" DATETIME NOT NULL,
    "gebuchtVon" TEXT NOT NULL,
    "benutzerId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESERVIERT',
    "notiz" TEXT,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RessourcenReservierung_ressourceId_fkey" FOREIGN KEY ("ressourceId") REFERENCES "OrganisationRessource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Hintergrundauftrag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "typ" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'WARTEND',
    "prioritaet" INTEGER NOT NULL DEFAULT 100,
    "versuche" INTEGER NOT NULL DEFAULT 0,
    "maxVersuche" INTEGER NOT NULL DEFAULT 3,
    "ausfuehrenAb" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gestartetAm" DATETIME,
    "abgeschlossenAm" DATETIME,
    "fehler" TEXT,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "NovaMail" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nachrichtenId" TEXT NOT NULL,
    "absender" TEXT NOT NULL,
    "empfaenger" TEXT NOT NULL,
    "cc" TEXT,
    "betreff" TEXT NOT NULL,
    "inhalt" TEXT NOT NULL,
    "ordner" TEXT NOT NULL DEFAULT 'POSTEINGANG',
    "gelesen" BOOLEAN NOT NULL DEFAULT false,
    "wichtig" BOOLEAN NOT NULL DEFAULT false,
    "anhangJson" TEXT NOT NULL DEFAULT '[]',
    "bezugTyp" TEXT,
    "bezugId" TEXT,
    "benutzerId" INTEGER NOT NULL,
    "gesendetAm" DATETIME,
    "empfangenAm" DATETIME,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "KommunikationsKanal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "typ" TEXT NOT NULL DEFAULT 'TEAM',
    "beschreibung" TEXT,
    "abteilung" TEXT,
    "erstelltVonId" INTEGER NOT NULL,
    "mitgliederJson" TEXT NOT NULL DEFAULT '[]',
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "KommunikationsNachricht" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kanalId" INTEGER NOT NULL,
    "absenderId" INTEGER NOT NULL,
    "absender" TEXT NOT NULL,
    "inhalt" TEXT NOT NULL,
    "anhangJson" TEXT NOT NULL DEFAULT '[]',
    "bearbeitet" BOOLEAN NOT NULL DEFAULT false,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" DATETIME NOT NULL,
    CONSTRAINT "KommunikationsNachricht_kanalId_fkey" FOREIGN KEY ("kanalId") REFERENCES "KommunikationsKanal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BenutzerSitzung" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "benutzerId" INTEGER NOT NULL,
    "laeuftAbAm" DATETIME NOT NULL,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "letzteNutzungAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BenutzerSitzung_benutzerId_fkey" FOREIGN KEY ("benutzerId") REFERENCES "Benutzer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Systemeinstellung" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "schluessel" TEXT NOT NULL,
    "wert" TEXT NOT NULL,
    "typ" TEXT NOT NULL DEFAULT 'TEXT',
    "kategorie" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "beschreibung" TEXT,
    "aktualisiertVon" TEXT,
    "aktualisiertAm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Systemprotokoll" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "modul" TEXT NOT NULL,
    "aktion" TEXT NOT NULL,
    "details" TEXT,
    "stufe" TEXT NOT NULL DEFAULT 'INFO',
    "benutzer" TEXT,
    "objektTyp" TEXT,
    "objektId" TEXT,
    "alterWert" TEXT,
    "neuerWert" TEXT,
    "grund" TEXT,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Bestellung" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bestellnummer" TEXT NOT NULL,
    "lieferscheinnummer" TEXT,
    "lieferant" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Offen',
    "gesamtpositionen" INTEGER NOT NULL DEFAULT 0,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Telefonat" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "anrufer" TEXT NOT NULL,
    "firma" TEXT,
    "telefonnummer" TEXT,
    "betreff" TEXT NOT NULL,
    "notiz" TEXT,
    "sachbearbeiter" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OFFEN',
    "angenommenVon" TEXT NOT NULL,
    "angenommenAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "erledigtAm" DATETIME
);

-- CreateTable
CREATE TABLE "Abwesenheit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "benutzerId" INTEGER,
    "mitarbeiter" TEXT NOT NULL,
    "art" TEXT NOT NULL,
    "von" DATETIME NOT NULL,
    "bis" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EINGETRAGEN',
    "notiz" TEXT,
    "erstelltVon" TEXT NOT NULL,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Zeitbuchung" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "benutzerId" INTEGER NOT NULL,
    "mitarbeiter" TEXT NOT NULL,
    "typ" TEXT NOT NULL,
    "zeitpunkt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notiz" TEXT
);

-- CreateTable
CREATE TABLE "Kunde" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kundennummer" TEXT NOT NULL,
    "firmenname" TEXT NOT NULL,
    "ansprechpartner" TEXT,
    "email" TEXT,
    "telefon" TEXT,
    "ort" TEXT,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Angebot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "angebotsnummer" TEXT NOT NULL,
    "kundeId" INTEGER NOT NULL,
    "titel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ENTWURF',
    "nettowert" REAL NOT NULL DEFAULT 0,
    "gueltigBis" DATETIME,
    "erstelltVon" TEXT,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" DATETIME NOT NULL,
    CONSTRAINT "Angebot_kundeId_fkey" FOREIGN KEY ("kundeId") REFERENCES "Kunde" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Dispositionsvorschlag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "artikelId" INTEGER NOT NULL,
    "vorgeschlageneMenge" REAL NOT NULL,
    "begruendung" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEU',
    "erstelltVon" TEXT,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bearbeitetAm" DATETIME,
    CONSTRAINT "Dispositionsvorschlag_artikelId_fkey" FOREIGN KEY ("artikelId") REFERENCES "Artikel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Rechnung" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "rechnungsnummer" TEXT NOT NULL,
    "kundeId" INTEGER,
    "kundeName" TEXT NOT NULL,
    "betreff" TEXT NOT NULL,
    "nettowert" REAL NOT NULL,
    "steuersatz" REAL NOT NULL DEFAULT 19,
    "bruttowert" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OFFEN',
    "rechnungsdatum" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "faelligAm" DATETIME NOT NULL,
    "bezahltAm" DATETIME,
    "erstelltVon" TEXT,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Rechnung_kundeId_fkey" FOREIGN KEY ("kundeId") REFERENCES "Kunde" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Zahlung" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "rechnungId" INTEGER NOT NULL,
    "betrag" REAL NOT NULL,
    "zahlungsart" TEXT NOT NULL DEFAULT 'Ãœberweisung',
    "referenz" TEXT,
    "gebuchtVon" TEXT,
    "gebuchtAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Zahlung_rechnungId_fkey" FOREIGN KEY ("rechnungId") REFERENCES "Rechnung" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CadDokument" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dokumentnummer" TEXT NOT NULL,
    "artikelId" INTEGER,
    "artikelnummer" TEXT,
    "bezeichnung" TEXT NOT NULL,
    "dokumenttyp" TEXT NOT NULL DEFAULT 'ZEICHNUNG',
    "version" TEXT NOT NULL DEFAULT 'A',
    "status" TEXT NOT NULL DEFAULT 'ENTWURF',
    "dateiname" TEXT,
    "aenderungsnotiz" TEXT,
    "bearbeiter" TEXT,
    "freigegebenVon" TEXT,
    "freigegebenAm" DATETIME,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Artikel_artikelnummer_key" ON "Artikel"("artikelnummer");

-- CreateIndex
CREATE INDEX "Artikel_artikelnummer_idx" ON "Artikel"("artikelnummer");

-- CreateIndex
CREATE INDEX "Artikel_produktname_idx" ON "Artikel"("produktname");

-- CreateIndex
CREATE INDEX "Artikel_lagerplatz_idx" ON "Artikel"("lagerplatz");

-- CreateIndex
CREATE UNIQUE INDEX "Lagerplatz_code_key" ON "Lagerplatz"("code");

-- CreateIndex
CREATE INDEX "Lagerplatz_bereich_idx" ON "Lagerplatz"("bereich");

-- CreateIndex
CREATE INDEX "Lagerbestand_lagerplatzId_idx" ON "Lagerbestand"("lagerplatzId");

-- CreateIndex
CREATE UNIQUE INDEX "Lagerbestand_artikelId_lagerplatzId_key" ON "Lagerbestand"("artikelId", "lagerplatzId");

-- CreateIndex
CREATE INDEX "Lagerbewegung_status_idx" ON "Lagerbewegung"("status");

-- CreateIndex
CREATE INDEX "Lagerbewegung_typ_idx" ON "Lagerbewegung"("typ");

-- CreateIndex
CREATE INDEX "Lagerbewegung_lieferscheinnummer_idx" ON "Lagerbewegung"("lieferscheinnummer");

-- CreateIndex
CREATE UNIQUE INDEX "Ladungstraeger_barcode_key" ON "Ladungstraeger"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "LadungstraegerPosition_ladungstraegerId_artikelId_key" ON "LadungstraegerPosition"("ladungstraegerId", "artikelId");

-- CreateIndex
CREATE INDEX "InventurPosition_status_idx" ON "InventurPosition"("status");

-- CreateIndex
CREATE INDEX "InventurPosition_lagerplatzId_idx" ON "InventurPosition"("lagerplatzId");

-- CreateIndex
CREATE UNIQUE INDEX "Pruefauftrag_pruefnummer_key" ON "Pruefauftrag"("pruefnummer");

-- CreateIndex
CREATE INDEX "Pruefauftrag_status_idx" ON "Pruefauftrag"("status");

-- CreateIndex
CREATE INDEX "Pruefauftrag_typ_idx" ON "Pruefauftrag"("typ");

-- CreateIndex
CREATE UNIQUE INDEX "Qualitaetspruefung_pruefauftragId_key" ON "Qualitaetspruefung"("pruefauftragId");

-- CreateIndex
CREATE INDEX "Qualitaetsfreigabe_entscheidung_idx" ON "Qualitaetsfreigabe"("entscheidung");

-- CreateIndex
CREATE INDEX "Sperrbestand_status_idx" ON "Sperrbestand"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Konfektionsauftrag_auftragsnummer_key" ON "Konfektionsauftrag"("auftragsnummer");

-- CreateIndex
CREATE INDEX "Konfektionsauftrag_status_idx" ON "Konfektionsauftrag"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Logistikauftrag_auftragsnummer_key" ON "Logistikauftrag"("auftragsnummer");

-- CreateIndex
CREATE INDEX "Logistikauftrag_status_idx" ON "Logistikauftrag"("status");

-- CreateIndex
CREATE INDEX "Logistikauftrag_kunde_idx" ON "Logistikauftrag"("kunde");

-- CreateIndex
CREATE UNIQUE INDEX "Logistikposition_auftragId_artikelId_key" ON "Logistikposition"("auftragId", "artikelId");

-- CreateIndex
CREATE UNIQUE INDEX "Kommissionierung_kommissioniernummer_key" ON "Kommissionierung"("kommissioniernummer");

-- CreateIndex
CREATE UNIQUE INDEX "Kommissionierung_auftragId_key" ON "Kommissionierung"("auftragId");

-- CreateIndex
CREATE UNIQUE INDEX "Ladung_ladungsnummer_key" ON "Ladung"("ladungsnummer");

-- CreateIndex
CREATE INDEX "Ladung_status_idx" ON "Ladung"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Ladungsauftrag_ladungId_auftragId_key" ON "Ladungsauftrag"("ladungId", "auftragId");

-- CreateIndex
CREATE UNIQUE INDEX "Versand_versandnummer_key" ON "Versand"("versandnummer");

-- CreateIndex
CREATE UNIQUE INDEX "Versand_auftragId_key" ON "Versand"("auftragId");

-- CreateIndex
CREATE INDEX "Versand_status_idx" ON "Versand"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Desadv_desadvnummer_key" ON "Desadv"("desadvnummer");

-- CreateIndex
CREATE UNIQUE INDEX "Desadv_versandId_key" ON "Desadv"("versandId");

-- CreateIndex
CREATE INDEX "Desadv_status_idx" ON "Desadv"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Lieferschein_lieferscheinnummer_key" ON "Lieferschein"("lieferscheinnummer");

-- CreateIndex
CREATE UNIQUE INDEX "Lieferschein_versandId_key" ON "Lieferschein"("versandId");

-- CreateIndex
CREATE UNIQUE INDEX "Rollenprofil_code_key" ON "Rollenprofil"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Benutzer_personalnummer_key" ON "Benutzer"("personalnummer");

-- CreateIndex
CREATE INDEX "Benutzer_nachname_idx" ON "Benutzer"("nachname");

-- CreateIndex
CREATE INDEX "Benutzer_rollenprofilCode_idx" ON "Benutzer"("rollenprofilCode");

-- CreateIndex
CREATE INDEX "Benutzer_aktiv_idx" ON "Benutzer"("aktiv");

-- CreateIndex
CREATE INDEX "MitarbeiterAufgabe_benutzerId_status_idx" ON "MitarbeiterAufgabe"("benutzerId", "status");

-- CreateIndex
CREATE INDEX "MitarbeiterAufgabe_faelligAm_idx" ON "MitarbeiterAufgabe"("faelligAm");

-- CreateIndex
CREATE INDEX "Mitarbeiterschicht_benutzerId_datum_idx" ON "Mitarbeiterschicht"("benutzerId", "datum");

-- CreateIndex
CREATE INDEX "Mitarbeiterschicht_datum_idx" ON "Mitarbeiterschicht"("datum");

-- CreateIndex
CREATE UNIQUE INDEX "DigitalerArbeitsauftrag_nummer_key" ON "DigitalerArbeitsauftrag"("nummer");

-- CreateIndex
CREATE INDEX "DigitalerArbeitsauftrag_benutzerId_status_idx" ON "DigitalerArbeitsauftrag"("benutzerId", "status");

-- CreateIndex
CREATE INDEX "DigitalerArbeitsauftrag_faelligAm_idx" ON "DigitalerArbeitsauftrag"("faelligAm");

-- CreateIndex
CREATE INDEX "InterneBenachrichtigung_benutzerId_gelesen_idx" ON "InterneBenachrichtigung"("benutzerId", "gelesen");

-- CreateIndex
CREATE INDEX "InterneBenachrichtigung_erstelltAm_idx" ON "InterneBenachrichtigung"("erstelltAm");

-- CreateIndex
CREATE INDEX "OrganisationTermin_startAm_endeAm_idx" ON "OrganisationTermin"("startAm", "endeAm");

-- CreateIndex
CREATE INDEX "OrganisationTermin_organisatorId_idx" ON "OrganisationTermin"("organisatorId");

-- CreateIndex
CREATE INDEX "OrganisationTermin_sichtbarkeit_idx" ON "OrganisationTermin"("sichtbarkeit");

-- CreateIndex
CREATE UNIQUE INDEX "OrganisationRessource_name_key" ON "OrganisationRessource"("name");

-- CreateIndex
CREATE INDEX "OrganisationRessource_kategorie_idx" ON "OrganisationRessource"("kategorie");

-- CreateIndex
CREATE INDEX "OrganisationRessource_aktiv_idx" ON "OrganisationRessource"("aktiv");

-- CreateIndex
CREATE INDEX "RessourcenReservierung_ressourceId_startAm_endeAm_idx" ON "RessourcenReservierung"("ressourceId", "startAm", "endeAm");

-- CreateIndex
CREATE INDEX "RessourcenReservierung_benutzerId_idx" ON "RessourcenReservierung"("benutzerId");

-- CreateIndex
CREATE INDEX "Hintergrundauftrag_status_ausfuehrenAb_prioritaet_idx" ON "Hintergrundauftrag"("status", "ausfuehrenAb", "prioritaet");

-- CreateIndex
CREATE INDEX "Hintergrundauftrag_typ_idx" ON "Hintergrundauftrag"("typ");

-- CreateIndex
CREATE INDEX "Hintergrundauftrag_erstelltAm_idx" ON "Hintergrundauftrag"("erstelltAm");

-- CreateIndex
CREATE UNIQUE INDEX "NovaMail_nachrichtenId_key" ON "NovaMail"("nachrichtenId");

-- CreateIndex
CREATE INDEX "NovaMail_benutzerId_ordner_idx" ON "NovaMail"("benutzerId", "ordner");

-- CreateIndex
CREATE INDEX "NovaMail_empfangenAm_idx" ON "NovaMail"("empfangenAm");

-- CreateIndex
CREATE INDEX "NovaMail_bezugTyp_bezugId_idx" ON "NovaMail"("bezugTyp", "bezugId");

-- CreateIndex
CREATE INDEX "KommunikationsKanal_typ_aktiv_idx" ON "KommunikationsKanal"("typ", "aktiv");

-- CreateIndex
CREATE INDEX "KommunikationsKanal_abteilung_idx" ON "KommunikationsKanal"("abteilung");

-- CreateIndex
CREATE INDEX "KommunikationsNachricht_kanalId_erstelltAm_idx" ON "KommunikationsNachricht"("kanalId", "erstelltAm");

-- CreateIndex
CREATE INDEX "KommunikationsNachricht_absenderId_idx" ON "KommunikationsNachricht"("absenderId");

-- CreateIndex
CREATE UNIQUE INDEX "BenutzerSitzung_tokenHash_key" ON "BenutzerSitzung"("tokenHash");

-- CreateIndex
CREATE INDEX "BenutzerSitzung_benutzerId_idx" ON "BenutzerSitzung"("benutzerId");

-- CreateIndex
CREATE INDEX "BenutzerSitzung_laeuftAbAm_idx" ON "BenutzerSitzung"("laeuftAbAm");

-- CreateIndex
CREATE UNIQUE INDEX "Systemeinstellung_schluessel_key" ON "Systemeinstellung"("schluessel");

-- CreateIndex
CREATE INDEX "Systemeinstellung_kategorie_idx" ON "Systemeinstellung"("kategorie");

-- CreateIndex
CREATE INDEX "Systemprotokoll_modul_idx" ON "Systemprotokoll"("modul");

-- CreateIndex
CREATE INDEX "Systemprotokoll_stufe_idx" ON "Systemprotokoll"("stufe");

-- CreateIndex
CREATE INDEX "Systemprotokoll_erstelltAm_idx" ON "Systemprotokoll"("erstelltAm");

-- CreateIndex
CREATE UNIQUE INDEX "Bestellung_bestellnummer_key" ON "Bestellung"("bestellnummer");

-- CreateIndex
CREATE UNIQUE INDEX "Bestellung_lieferscheinnummer_key" ON "Bestellung"("lieferscheinnummer");

-- CreateIndex
CREATE INDEX "Telefonat_status_idx" ON "Telefonat"("status");

-- CreateIndex
CREATE INDEX "Telefonat_angenommenAm_idx" ON "Telefonat"("angenommenAm");

-- CreateIndex
CREATE INDEX "Abwesenheit_von_bis_idx" ON "Abwesenheit"("von", "bis");

-- CreateIndex
CREATE INDEX "Abwesenheit_benutzerId_idx" ON "Abwesenheit"("benutzerId");

-- CreateIndex
CREATE INDEX "Zeitbuchung_benutzerId_zeitpunkt_idx" ON "Zeitbuchung"("benutzerId", "zeitpunkt");

-- CreateIndex
CREATE UNIQUE INDEX "Kunde_kundennummer_key" ON "Kunde"("kundennummer");

-- CreateIndex
CREATE INDEX "Kunde_firmenname_idx" ON "Kunde"("firmenname");

-- CreateIndex
CREATE UNIQUE INDEX "Angebot_angebotsnummer_key" ON "Angebot"("angebotsnummer");

-- CreateIndex
CREATE INDEX "Angebot_status_idx" ON "Angebot"("status");

-- CreateIndex
CREATE INDEX "Angebot_kundeId_idx" ON "Angebot"("kundeId");

-- CreateIndex
CREATE INDEX "Dispositionsvorschlag_status_idx" ON "Dispositionsvorschlag"("status");

-- CreateIndex
CREATE INDEX "Dispositionsvorschlag_artikelId_idx" ON "Dispositionsvorschlag"("artikelId");

-- CreateIndex
CREATE UNIQUE INDEX "Rechnung_rechnungsnummer_key" ON "Rechnung"("rechnungsnummer");

-- CreateIndex
CREATE INDEX "Rechnung_status_idx" ON "Rechnung"("status");

-- CreateIndex
CREATE INDEX "Rechnung_faelligAm_idx" ON "Rechnung"("faelligAm");

-- CreateIndex
CREATE INDEX "Zahlung_rechnungId_idx" ON "Zahlung"("rechnungId");

-- CreateIndex
CREATE INDEX "Zahlung_gebuchtAm_idx" ON "Zahlung"("gebuchtAm");

-- CreateIndex
CREATE UNIQUE INDEX "CadDokument_dokumentnummer_key" ON "CadDokument"("dokumentnummer");

-- CreateIndex
CREATE INDEX "CadDokument_artikelId_idx" ON "CadDokument"("artikelId");

-- CreateIndex
CREATE INDEX "CadDokument_status_idx" ON "CadDokument"("status");
