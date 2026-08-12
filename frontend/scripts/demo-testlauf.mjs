import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL fehlt in .env.local.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = await pool.connect();
const zeit = new Date();
const datum = zeit.toISOString().slice(0, 10).replaceAll("-", "");
const kurz = Date.now().toString().slice(-6);
const suffix = `${datum}-${kurz}`;
const warenwert = 6847.39;
const zahlungswert = 4312.68;
const nettowert = Math.round((warenwert / 1.19) * 100) / 100;

async function eins(sql, werte = []) {
  const ergebnis = await db.query(sql, werte);
  return ergebnis.rows[0];
}

try {
  console.log("\nNOVA Demo-Ablauf wird vorbereitet ...\n");
  await db.query("BEGIN");

  const artikel = await eins(
    'SELECT id, artikelnummer, produktname FROM "Artikel" WHERE aktiv = true ORDER BY CASE WHEN verkaufspreis > 0 THEN 0 ELSE 1 END, id LIMIT 1',
  );
  const lager = await eins(
    'SELECT id, code FROM "Lagerplatz" WHERE aktiv = true ORDER BY id LIMIT 1',
  );
  if (!artikel) throw new Error("Es wurde kein aktiver Demo-Artikel gefunden.");

  const kunde = await eins(`
    INSERT INTO "Kunde" ("kundennummer","firmenname","ansprechpartner","email","telefon","ort","aktiv","erstelltAm","aktualisiertAm")
    VALUES ('KD-VIDEO','NOVA Video-Testkunde GmbH','Alexander Test','video@demo.invalid','030 555 0100','Berlin',true,NOW(),NOW())
    ON CONFLICT ("kundennummer") DO UPDATE SET "firmenname"=EXCLUDED."firmenname", "aktualisiertAm"=NOW()
    RETURNING id
  `);

  // 1. Einkauf: Bedarf prüfen und eine offene Bestellung bearbeiten.
  await db.query(
    `INSERT INTO "Dispositionsvorschlag" ("artikelId","vorgeschlageneMenge","begruendung","status","erstelltVon","erstelltAm") VALUES ($1,80,$2,'NEU','NOVA Demo-Automatik',NOW())`,
    [artikel.id, `Demo-Bedarf ${suffix}: Mindestbestand auffüllen`],
  );
  await db.query(
    `INSERT INTO "Bestellung" ("bestellnummer","lieferant","status","gesamtpositionen","erstelltAm","aktualisiertAm") VALUES ($1,'NOVA Demo-Lieferant','Offen',4,NOW(),NOW())`,
    [`DEMO-EK-${suffix}`],
  );

  // 2. Lager: Eine per MDE erfasste Lieferung wartet auf die PC-Bestätigung.
  await db.query(
    `INSERT INTO "Lagerbewegung" ("typ","status","artikelId","menge","nachLagerplatzId","notiz","erfasstVon","erfasstAm") VALUES ('EINGANG','ERFASST',$1,80,$2,$3,'Demo MDE-Scanner',NOW())`,
    [
      artikel.id,
      lager?.id ?? null,
      `Demo-Wareneingang ${suffix} – Lieferschein am PC eintragen`,
    ],
  );

  // 3. Qualität: Der Prüfauftrag soll in der Vorführung abgeschlossen werden.
  await db.query(
    `INSERT INTO "Pruefauftrag" ("pruefnummer","artikelId","lagerplatzId","typ","status","prioritaet","pruefmenge","auftraggeber","zugewiesenAn","notiz","erstelltAm","faelligAm") VALUES ($1,$2,$3,'EINGANGSPRUEFUNG','OFFEN','HOCH',80,'Wareneingang','Qualitätssicherung',$4,NOW(),CURRENT_DATE)`,
    [
      `DEMO-QS-${suffix}`,
      artikel.id,
      lager?.id ?? null,
      `Demo-Prüfung ${suffix}`,
    ],
  );

  // 4. Logistik: Kundenauftrag wartet auf Kommissionierung und Versand.
  const auftrag = await eins(
    `INSERT INTO "Logistikauftrag" ("auftragsnummer","kunde","kundenreferenz","lieferadresse","status","prioritaet","liefertermin","notiz","erstelltVon","erstelltAm","aktualisiertAm") VALUES ($1,'NOVA Video-Testkunde GmbH',$2,'Teststraße 1, 10115 Berlin','OFFEN','EXPRESS',CURRENT_DATE,$3,'NOVA Demo-Automatik',NOW(),NOW()) RETURNING id`,
    [
      `DEMO-AU-${suffix}`,
      `VIDEO-${suffix}`,
      "Demo: kommissionieren, verladen und versenden",
    ],
  );
  await db.query(
    `INSERT INTO "Logistikposition" ("auftragId","artikelId","menge","einzelpreis","kommissionierteMenge") VALUES ($1,$2,24,129.90,0)`,
    [auftrag.id, artikel.id],
  );

  // 5. Versand/Buchhaltung: Eine ältere Demo-Sendung wartet auf Zahlung.
  const versandAuftrag = await eins(
    `INSERT INTO "Logistikauftrag" ("auftragsnummer","kunde","kundenreferenz","lieferadresse","status","prioritaet","liefertermin","notiz","erstelltVon","erstelltAm","aktualisiertAm") VALUES ($1,'NOVA Demo-Kunde Nord GmbH',$2,'Hafenstraße 22, 20457 Hamburg','VERSENDET','NORMAL',CURRENT_DATE,'Demo-Sendung – Zahlung noch bestätigen','NOVA Demo-Automatik',NOW(),NOW()) RETURNING id`,
    [`DEMO-ZA-${suffix}`, `ZAHLUNG-${suffix}`],
  );
  await db.query(
    `INSERT INTO "Logistikposition" ("auftragId","artikelId","menge","einzelpreis","kommissionierteMenge") VALUES ($1,$2,12,174.35,12)`,
    [versandAuftrag.id, artikel.id],
  );
  const offeneSendung = await eins(
    `INSERT INTO "Versand" ("versandnummer","auftragId","status","versandart","trackingnummer","warenwert","bezahlt","versendetVon","versendetAm","erstelltAm") VALUES ($1,$2,'VERSENDET','Spedition',$3,2092.20,false,'NOVA Demo-Automatik',NOW(),NOW()) RETURNING id`,
    [`DEMO-VS-${suffix}`, versandAuftrag.id, `NOVA-${kurz}`],
  );
  await db.query(
    `INSERT INTO "Lieferschein" ("lieferscheinnummer","versandId","status","bemerkung","erstelltVon","erstelltAm") VALUES ($1,$2,'ERSTELLT','Demo-Lieferschein zur offenen Zahlung','NOVA Demo-Automatik',NOW())`,
    [`DEMO-LS-${suffix}`, offeneSendung.id],
  );

  // 6. Ein abgeschlossener Tagesvorgang liefert sichtbare Dashboard-Werte.
  const historieAuftrag = await eins(
    `INSERT INTO "Logistikauftrag" ("auftragsnummer","kunde","status","prioritaet","liefertermin","notiz","erstelltVon","erstelltAm","aktualisiertAm") VALUES ($1,'NOVA Demo-Bestandskunde GmbH','VERSENDET','NORMAL',CURRENT_DATE,'Abgeschlossener Demo-Tagesvorgang','NOVA Demo-Automatik',NOW(),NOW()) RETURNING id`,
    [`DEMO-HIST-${suffix}`],
  );
  await db.query(
    `INSERT INTO "Logistikposition" ("auftragId","artikelId","menge","einzelpreis","kommissionierteMenge") VALUES ($1,$2,25,129.90,25)`,
    [historieAuftrag.id, artikel.id],
  );
  const historieVersand = await eins(
    `INSERT INTO "Versand" ("versandnummer","auftragId","status","versandart","trackingnummer","warenwert","bezahlt","bezahltVon","bezahltAm","versendetVon","versendetAm","erstelltAm") VALUES ($1,$2,'VERSENDET','Spedition',$3,$4,true,'NOVA Demo-Automatik',NOW(),'NOVA Demo-Automatik',NOW(),NOW()) RETURNING id`,
    [`DEMO-HVS-${suffix}`, historieAuftrag.id, `NOVA-H-${kurz}`, warenwert],
  );
  await db.query(
    `INSERT INTO "Lieferschein" ("lieferscheinnummer","versandId","status","bemerkung","erstelltVon","erstelltAm") VALUES ($1,$2,'ERSTELLT','Abgeschlossener Demo-Lieferschein','NOVA Demo-Automatik',NOW())`,
    [`DEMO-HLS-${suffix}`, historieVersand.id],
  );
  const rechnung = await eins(
    `INSERT INTO "Rechnung" ("rechnungsnummer","kundeId","kundeName","betreff","nettowert","steuersatz","bruttowert","status","rechnungsdatum","faelligAm","erstelltVon","erstelltAm") VALUES ($1,$2,'NOVA Video-Testkunde GmbH','Demo-Tagesauftrag',$3,19,$4,'TEILBEZAHLT',NOW(),CURRENT_DATE+14,'NOVA Demo-Automatik',NOW()) RETURNING id`,
    [`DEMO-RE-${suffix}`, kunde.id, nettowert, warenwert],
  );
  await db.query(
    `INSERT INTO "Zahlung" ("rechnungId","betrag","zahlungsart","referenz","gebuchtVon","gebuchtAm") VALUES ($1,$2,'Überweisung',$3,'NOVA Demo-Automatik',NOW())`,
    [rechnung.id, zahlungswert, `DEMO-ZAHLUNG-${suffix}`],
  );

  await db.query(
    `INSERT INTO "Systemprotokoll" ("modul","aktion","details","stufe","benutzer","erstelltAm") VALUES ('NOVA Demo','Interaktiver Demo-Ablauf vorbereitet',$1,'INFO','NOVA Demo-Automatik',NOW())`,
    [
      `Demo ${suffix}: Einkauf, Lager, QS, Logistik, Versand und Zahlung warten auf Bearbeitung.`,
    ],
  );

  await db.query("COMMIT");

  console.log("Demo ist bereit. Diese Schritte kannst du jetzt vorführen:\n");
  console.log(`1. Einkauf:        DEMO-EK-${suffix} prüfen`);
  console.log("2. Lager:          MDE-Wareneingang am PC bestätigen");
  console.log(`3. Qualität:       DEMO-QS-${suffix} abschließen`);
  console.log(`4. Kommissionierung: DEMO-AU-${suffix} starten und abschließen`);
  console.log(
    "5. Logistik:       Ladung planen, Auftrag zuordnen und Versand vorbereiten",
  );
  console.log(
    "6. Versand:        Sendung bestätigen und anschließend Zahlung bestätigen",
  );
  console.log("7. Dashboard:      Tagesumsatz und Tagesaktivitäten ansehen\n");
  console.log(`Artikel: ${artikel.artikelnummer} – ${artikel.produktname}`);
  console.log(`Lagerplatz: ${lager?.code ?? "ohne Lagerplatz"}`);
  console.log(
    "Browserseiten aktualisieren oder auf „Live aktualisieren“ klicken.\n",
  );
} catch (error) {
  await db.query("ROLLBACK");
  console.error(
    "\nDemo-Testlauf fehlgeschlagen:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
} finally {
  db.release();
  await pool.end();
}
