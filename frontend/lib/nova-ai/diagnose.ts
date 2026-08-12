import type { NovaAnfrage } from "./anfrage-parser";

export async function diagnoseAntwort(
  anfrage: NovaAnfrage
): Promise<string> {
  const eingabe = anfrage.original.toLowerCase();

if (
  eingabe.includes("demo") ||
  eingabe.includes("testlauf")
) {
  const datenbankUrlVorhanden = Boolean(
  process.env.DATABASE_URL
);


  return `
🔍 Diagnose: Demo-Testlauf

${datenbankUrlVorhanden
  ? "✅ DATABASE_URL ist gesetzt."
  : "❌ DATABASE_URL fehlt."}



Weitere Prüfungen:

1. Ist PostgreSQL gestartet?
2. Existiert mindestens ein aktiver Artikel?
3. Existiert mindestens ein aktiver Lagerplatz?
4. Ist der Dashboard-Button verbunden?
5. Existiert eine API-Route für den Demo-Testlauf?
6. Verwendet die Desktop-App den aktuellen Build?
`.trim();
}

  if (
    eingabe.includes("sidebar") ||
    eingabe.includes("seitenleiste") ||
    eingabe.includes("menü") ||
    eingabe.includes("menu")
  ) {
    return `
🧩 Diagnose: Sidebar

Mögliche Ursachen:

1. Dashboard und Unterseiten verwenden unterschiedliche Layouts.
2. Es werden zwei verschiedene Sidebar-Komponenten geladen.
3. Eine Seite verwendet abweichende Breiten oder Innenabstände.
4. Klassen wie max-w, container, mx-auto oder padding unterscheiden sich.
5. Die Desktop-App lädt möglicherweise einen älteren Build.

Dashboard und Unterseiten sollten dieselbe zentrale Layout- und Sidebar-Komponente verwenden.
`.trim();
  }

  if (
    eingabe.includes("datenbank") ||
    eingabe.includes("postgres") ||
    eingabe.includes("database")
  ) {
    return `
🗄️ Diagnose: Datenbank

Prüfe bitte:

1. Läuft der PostgreSQL-Dienst?
2. Ist DATABASE_URL korrekt gesetzt?
3. Sind Benutzername, Passwort, Port und Datenbankname korrekt?
4. Wurden die Prisma-Migrationen ausgeführt?
5. Kann NOVA eine Verbindung zur Datenbank herstellen?
6. Gibt es einen Fehler im Server-Terminal?

Eine automatische Datenbankprüfung wird später ergänzt.
`.trim();
  }

  if (
    eingabe.includes("desktop") ||
    eingabe.includes("electron") ||
    eingabe.includes("app startet") ||
    eingabe.includes("app öffnet")
  ) {
    return `
🖥️ Diagnose: Desktop-App

Prüfe bitte:

1. Läuft der benötigte Next.js-Server?
2. Lädt Electron die richtige Adresse?
3. Verwendet die App den aktuellen Build?
4. Sind die Umgebungsvariablen verfügbar?
5. Gibt es Fehler im Electron-Main-Prozess?
6. Funktioniert dieselbe Funktion in der Webversion?

Desktop- und Webversion müssen getrennt getestet werden.
`.trim();
  }

  if (
    anfrage.modul !== "unbekannt"
  ) {
    return `
🔧 Diagnose für das Modul "${anfrage.modul}"

Ich habe erkannt, dass das Problem zum Modul "${anfrage.modul}" gehört.

Bitte prüfe:

1. Welche Aktion wurde ausgeführt?
2. Welche Meldung wurde angezeigt?
3. Betrifft der Fehler nur die Desktop-App oder auch die Webversion?
4. Ist der betroffene Datensatz vollständig?
5. Besitzt der angemeldete Benutzer die nötige Berechtigung?

Für dieses Modul existiert noch keine vollständige automatische Fehlerprüfung.
`.trim();
  }

  return `
🔍 Ich habe ein Problem erkannt, kann es aber noch keinem NOVA-Modul eindeutig zuordnen.

Beschreibe bitte:

• Was wolltest du machen?
• Was ist stattdessen passiert?
• In welchem Modul tritt das Problem auf?
• Betrifft es die Desktop-App, die Webversion oder beide?
• Wird eine Fehlermeldung angezeigt?
`.trim();
}