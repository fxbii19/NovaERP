const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");
const { Client } = require("pg");

const projektOrdner = path.resolve(__dirname, "..");
const sqliteQuelle = path.join(projektOrdner, "dev.db");
const sqliteSchnappschuss = path.join(
  projektOrdner,
  "database",
  "backups",
  "dev-uebergabe-postgresql.db"
);

function ladeDatabaseUrl() {
  const envPfad = path.join(projektOrdner, ".env");
  const inhalt = fs.readFileSync(envPfad, "utf8");
  const treffer = inhalt.match(/^DATABASE_URL\s*=\s*(.+)$/m);

  if (!treffer) {
    throw new Error("DATABASE_URL fehlt in .env.");
  }

  return treffer[1].trim().replace(/^['"]|['"]$/g, "");
}

function bezeichner(name) {
  return `"${name.replaceAll('"', '""')}"`;
}

function sortiereTabellen(db, tabellen) {
  const offen = new Set(tabellen);
  const fertig = [];

  while (offen.size > 0) {
    const bereit = [...offen].filter((tabelle) =>
      db
        .pragma(`foreign_key_list('${tabelle.replaceAll("'", "''")}')`)
        .every((fremdschluessel) => !offen.has(fremdschluessel.table))
    );

    if (bereit.length === 0) {
      throw new Error("Die Reihenfolge der Tabellen konnte nicht bestimmt werden.");
    }

    for (const tabelle of bereit) {
      offen.delete(tabelle);
      fertig.push(tabelle);
    }
  }

  return fertig;
}

function konvertiereWert(wert, typ) {
  if (wert === null || wert === undefined) return null;
  if (typ === "BOOLEAN") return Boolean(wert);

  if (typ === "DATETIME") {
    const datum = new Date(wert);
    if (Number.isNaN(datum.getTime())) {
      throw new Error(`Ungültiger Datumswert: ${wert}`);
    }
    return datum;
  }

  return wert;
}

async function importiereTabelle(sqlite, postgres, tabelle) {
  const spalten = sqlite.pragma(
    `table_info('${tabelle.replaceAll("'", "''")}')`
  );
  const zeilen = sqlite.prepare(`SELECT * FROM ${bezeichner(tabelle)}`).all();

  for (let start = 0; start < zeilen.length; start += 100) {
    const block = zeilen.slice(start, start + 100);
    const werte = [];
    const datensaetze = block.map((zeile) => {
      const platzhalter = spalten.map((spalte) => {
        werte.push(konvertiereWert(zeile[spalte.name], spalte.type));
        return `$${werte.length}`;
      });
      return `(${platzhalter.join(", ")})`;
    });

    if (datensaetze.length > 0) {
      await postgres.query(
        `INSERT INTO ${bezeichner(tabelle)} (${spalten
          .map((spalte) => bezeichner(spalte.name))
          .join(", ")}) VALUES ${datensaetze.join(", ")}`,
        werte
      );
    }
  }

  if (spalten.some((spalte) => spalte.name === "id")) {
    await postgres.query(
      `SELECT setval(
        pg_get_serial_sequence($1, 'id'),
        GREATEST(COALESCE(MAX("id"), 0), 1),
        COALESCE(MAX("id"), 0) > 0
      ) FROM ${bezeichner(tabelle)}`,
      [`"${tabelle}"`]
    );
  }

  return zeilen.length;
}

async function main() {
  const quelle = new Database(sqliteQuelle, { readonly: true });
  await quelle.backup(sqliteSchnappschuss);
  quelle.close();

  const sqlite = new Database(sqliteSchnappschuss, { readonly: true });
  const tabellen = sqlite
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> '_prisma_migrations'"
    )
    .all()
    .map((zeile) => zeile.name);
  const reihenfolge = sortiereTabellen(sqlite, tabellen);
  const postgres = new Client({ connectionString: ladeDatabaseUrl() });
  await postgres.connect();

  try {
    await postgres.query("BEGIN");
    await postgres.query(
      `TRUNCATE ${reihenfolge.map(bezeichner).join(", ")} RESTART IDENTITY CASCADE`
    );

    let gesamt = 0;
    for (const tabelle of reihenfolge) {
      const anzahl = await importiereTabelle(sqlite, postgres, tabelle);
      gesamt += anzahl;
      console.log(`${tabelle}: ${anzahl}`);
    }

    await postgres.query("COMMIT");
    console.log(`Übertragung abgeschlossen: ${gesamt} Datensätze in ${reihenfolge.length} Tabellen.`);
  } catch (error) {
    await postgres.query("ROLLBACK");
    throw error;
  } finally {
    sqlite.close();
    await postgres.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
