const Database = require("better-sqlite3");

const datenbankPfad = process.argv[2];
if (!datenbankPfad) throw new Error("Pfad zur NOVA-Datenbank fehlt.");

const db = new Database(datenbankPfad);
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS "Konfektionaer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nummer" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "ansprechpartner" TEXT,
    "email" TEXT,
    "telefon" TEXT,
    "adresse" TEXT,
    "aktiv" INTEGER NOT NULL DEFAULT 1,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS "Konfektionaer_name_idx" ON "Konfektionaer"("name");

  CREATE TABLE IF NOT EXISTS "KonfektionaerBestand" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "konfektionaerId" INTEGER NOT NULL,
    "artikelId" INTEGER NOT NULL,
    "menge" REAL NOT NULL DEFAULT 0,
    "aktualisiertAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KonfektionaerBestand_konfektionaerId_fkey" FOREIGN KEY ("konfektionaerId") REFERENCES "Konfektionaer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KonfektionaerBestand_artikelId_fkey" FOREIGN KEY ("artikelId") REFERENCES "Artikel"("id") ON DELETE RESTRICT ON UPDATE CASCADE
  );
  CREATE UNIQUE INDEX IF NOT EXISTS "KonfektionaerBestand_konfektionaerId_artikelId_key" ON "KonfektionaerBestand"("konfektionaerId", "artikelId");

  CREATE TABLE IF NOT EXISTS "KonfektionaerSendung" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sendungsnummer" TEXT NOT NULL UNIQUE,
    "konfektionaerId" INTEGER NOT NULL,
    "artikelId" INTEGER NOT NULL,
    "menge" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ZUR_FREIGABE',
    "freigegebenVon" TEXT,
    "freigegebenAm" DATETIME,
    "versandtVon" TEXT,
    "versandtAm" DATETIME,
    "rueckmeldeMenge" REAL NOT NULL DEFAULT 0,
    "ausschussMenge" REAL NOT NULL DEFAULT 0,
    "notiz" TEXT,
    "erstelltAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "abgeschlossenAm" DATETIME,
    CONSTRAINT "KonfektionaerSendung_konfektionaerId_fkey" FOREIGN KEY ("konfektionaerId") REFERENCES "Konfektionaer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "KonfektionaerSendung_artikelId_fkey" FOREIGN KEY ("artikelId") REFERENCES "Artikel"("id") ON DELETE RESTRICT ON UPDATE CASCADE
  );
  CREATE INDEX IF NOT EXISTS "KonfektionaerSendung_status_idx" ON "KonfektionaerSendung"("status");
`);

if (db.prepare('SELECT COUNT(*) AS anzahl FROM "Konfektionaer"').get().anzahl === 0) {
  const demoAnlegen = db.transaction(() => {
    const partnerEinfuegen = db.prepare('INSERT INTO "Konfektionaer" ("nummer", "name", "ansprechpartner", "email", "telefon", "adresse", "aktualisiertAm") VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)');
    const partner = [
      ["KF-0001", "Textilwerk Nord GmbH", "Elena Fischer", "fischer@nova-test.de", "+49 40 555 0101", "Werkstraße 14, 20539 Hamburg"],
      ["KF-0002", "NOVA Sewing Solutions", "Mehmet Kaya", "kaya@nova-test.de", "+49 231 555 0230", "Industrieweg 8, 44147 Dortmund"],
      ["KF-0003", "Manufaktur West", "Laura Becker", "becker@nova-test.de", "+49 202 555 0340", "Färberstraße 22, 42105 Wuppertal"],
    ].map((werte) => Number(partnerEinfuegen.run(...werte).lastInsertRowid));
    const artikel = db.prepare('SELECT "id" FROM "Artikel" WHERE "aktiv" = 1 ORDER BY "id" LIMIT 9').all();
    const bestandEinfuegen = db.prepare('INSERT INTO "KonfektionaerBestand" ("konfektionaerId", "artikelId", "menge", "aktualisiertAm") VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
    artikel.forEach((eintrag, index) => bestandEinfuegen.run(partner[index % partner.length], eintrag.id, 80 + ((index * 47) % 280)));
  });
  demoAnlegen();
}

db.close();
console.log("Konfektionärsstruktur ist bereit.");
