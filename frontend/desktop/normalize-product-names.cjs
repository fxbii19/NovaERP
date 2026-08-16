const Database = require("better-sqlite3");

const datenbank = new Database(process.argv[2]);
const bedingung = `
  variante IS NOT NULL
  AND trim(variante) <> ''
  AND (
    lower(produktname) LIKE lower('% – ' || variante)
    OR lower(produktname) LIKE lower('% — ' || variante)
    OR lower(produktname) LIKE lower('% - ' || variante)
  )
`;

try {
  datenbank.exec(`
    UPDATE Artikel
    SET produktname = trim(
      substr(produktname, 1, length(produktname) - length(variante) - 3)
    )
    WHERE ${bedingung};
  `);
} finally {
  datenbank.close();
}
