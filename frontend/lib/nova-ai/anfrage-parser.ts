export type NovaModul =
  | "bestand"
  | "bestellungen"
  | "dashboard"
  | "qs"
  | "versand"
  | "inventur"
  | "unbekannt";

export type NovaAktion =
  | "anzeigen"
  | "offen"
  | "suchen"
  | "pruefen"
  | "analysieren";

export type NovaIntent =
  | "DIAGNOSE"
  | "NAVIGATION"
  | "SYSTEM"
  | "ANALYSE"
  | "MODUL";

export type NovaAnfrage = {
  original: string;
  intent: NovaIntent;
  modul: NovaModul;
  aktion: NovaAktion;
  parameter: {
    lager?: string;
    artikel?: string;
    lieferant?: string;
    status?: string;
  };
};

function lagerErkennen(text: string): string | undefined {
  const eingabe = text.toLowerCase();

  if (
    eingabe.includes("lagerbestand") ||
    eingabe.includes("lager-bestand")
  ) {
    return undefined;
  }

  const treffer = text.match(
    /(?:^|\s)(?:im\s+)?(?:lagerplatz|lager|platz)\s+([a-z0-9-]+)(?=\s|$)/i
  );

  const lager = treffer?.[1];

  if (!lager) {
    return undefined;
  }

  return lager.toUpperCase();
}

function artikelErkennen(text: string): string | undefined {
  const treffer = text.match(
    /(?:artikel|artikelnummer)\s+([a-z0-9-_]+)/i
  );

  return treffer?.[1]?.toUpperCase();
}

function lieferantErkennen(text: string): string | undefined {
  const treffer = text.match(
    /(?:lieferant|lieferanten)\s+["„]?([^",.!?]+)["“]?/i
  );

  return treffer?.[1]?.trim();
}

function intentErkennen(eingabe: string): NovaIntent {
  const diagnoseBegriffe = [
    "geht nicht",
    "funktioniert nicht",
    "klappt nicht",
    "fehler",
    "problem",
    "kaputt",
    "reagiert nicht",
    "lädt nicht",
    "laedt nicht",
    "startet nicht",
    "warum kann ich nicht",
    "warum geht",
  ];

  if (
    diagnoseBegriffe.some((begriff) =>
      eingabe.includes(begriff)
    )
  ) {
    return "DIAGNOSE";
  }

  if (
    eingabe.includes("systemstatus") ||
    eingabe.includes("system status") ||
    eingabe.includes("serverstatus") ||
    eingabe.includes("datenbankstatus") ||
    eingabe.includes("läuft das system") ||
    eingabe.includes("laeuft das system")
  ) {
    return "SYSTEM";
  }

  if (
    eingabe.startsWith("öffne ") ||
    eingabe.startsWith("oeffne ") ||
    eingabe.startsWith("gehe zu ") ||
    eingabe.startsWith("navigiere zu ") ||
    eingabe.includes("modul öffnen") ||
    eingabe.includes("modul oeffnen")
  ) {
    return "NAVIGATION";
  }

  if (
    eingabe.includes("analysiere") ||
    eingabe.includes("analyse") ||
    eingabe.includes("auswertung")
  ) {
    return "ANALYSE";
  }

  return "MODUL";
}

function modulErkennen(eingabe: string): NovaModul {
  if (
    eingabe.includes("inventur") ||
    eingabe.includes("inventurdifferenz")
  ) {
    return "inventur";
  }

  if (
    eingabe.includes("versand") ||
    eingabe.includes("ladung") ||
    eingabe.includes("paket") ||
    eingabe.includes("lieferschein")
  ) {
    return "versand";
  }

  if (
    eingabe.includes("qs") ||
    eingabe.includes("qualität") ||
    eingabe.includes("qualitaet") ||
    eingabe.includes("prüfung") ||
    eingabe.includes("pruefung") ||
    eingabe.includes("prüfauftrag") ||
    eingabe.includes("pruefauftrag")
  ) {
    return "qs";
  }

  if (
    eingabe.includes("bestellung") ||
    eingabe.includes("lieferant") ||
    eingabe.includes("einkauf")
  ) {
    return "bestellungen";
  }

  if (
    eingabe.includes("dashboard") ||
    eingabe.includes("übersicht") ||
    eingabe.includes("uebersicht") ||
    eingabe.includes("statistik")
  ) {
    return "dashboard";
  }

  if (
    eingabe.includes("bestand") ||
    eingabe.includes("lager") ||
    eingabe.includes("artikel")
  ) {
    return "bestand";
  }

  return "unbekannt";
}

function aktionErkennen(eingabe: string): NovaAktion {
  if (eingabe.includes("offen")) {
    return "offen";
  }

  if (
    eingabe.includes("analysiere") ||
    eingabe.includes("analyse") ||
    eingabe.includes("auswertung")
  ) {
    return "analysieren";
  }

  if (
    eingabe.includes("prüf") ||
    eingabe.includes("pruef") ||
    eingabe.includes("kontrolliere")
  ) {
    return "pruefen";
  }

  if (
    eingabe.includes("suche") ||
    eingabe.includes("finde") ||
    eingabe.includes("zeige")
  ) {
    return "suchen";
  }

  return "anzeigen";
}

export function anfrageAnalysieren(
  text: string
): NovaAnfrage {
  const original = text.trim();
  const eingabe = original.toLowerCase();

  return {
    original,
    intent: intentErkennen(eingabe),
    modul: modulErkennen(eingabe),
    aktion: aktionErkennen(eingabe),
    parameter: {
      lager: lagerErkennen(original),
      artikel: artikelErkennen(original),
      lieferant: lieferantErkennen(original),
      status: eingabe.includes("offen")
        ? "offen"
        : undefined,
    },
  };
}