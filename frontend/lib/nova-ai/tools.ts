export type NovaToolName =
  | "dashboard"
  | "bestand"
  | "bestellungen"
  | "qualitaet"
  | "versand"
  | "inventur"
  | "unbekannt";

export type NovaToolErgebnis = {
  tool: NovaToolName;
  antwort: string;
};

export function toolErkennen(text: string): NovaToolName {
  const eingabe = text.toLowerCase();

  if (
    eingabe.includes("bestand") ||
    eingabe.includes("lagerbestand") ||
    eingabe.includes("artikel")
  ) {
    return "bestand";
  }

  if (
    eingabe.includes("bestellung") ||
    eingabe.includes("bestellungen") ||
    eingabe.includes("einkauf")
  ) {
    return "bestellungen";
  }

  if (
    eingabe.includes("qs") ||
    eingabe.includes("qualität") ||
    eingabe.includes("prüfung")
  ) {
    return "qualitaet";
  }

  if (
    eingabe.includes("versand") ||
    eingabe.includes("ladung") ||
    eingabe.includes("versendet")
  ) {
    return "versand";
  }

  if (eingabe.includes("inventur")) {
    return "inventur";
  }

  if (
    eingabe.includes("dashboard") ||
    eingabe.includes("übersicht") ||
    eingabe.includes("statistik")
  ) {
    return "dashboard";
  }

  return "unbekannt";
}

export function toolAusfuehren(text: string): NovaToolErgebnis {
  const tool = toolErkennen(text);

  switch (tool) {
    case "bestand":
      return {
        tool,
        antwort:
          "Das Bestandsmodul wurde erkannt. Die echte Lagerabfrage wird später mit der Datenbank verbunden.",
      };

    case "bestellungen":
      return {
        tool,
        antwort:
          "Das Bestellmodul wurde erkannt. Offene Bestellungen können später direkt aus NOVA ERP geladen werden.",
      };

    case "qualitaet":
      return {
        tool,
        antwort:
          "Das Qualitätsmodul wurde erkannt. QS-Aufträge und Prüfprobleme werden später automatisch ausgewertet.",
      };

    case "versand":
      return {
        tool,
        antwort:
          "Das Versandmodul wurde erkannt. Ladungen und Versandstatus werden später direkt geprüft.",
      };

    case "inventur":
      return {
        tool,
        antwort:
          "Das Inventurmodul wurde erkannt. Inventurdaten werden später automatisch analysiert.",
      };

    case "dashboard":
      return {
        tool,
        antwort:
          "Das Dashboard-Modul wurde erkannt. Kennzahlen und Auffälligkeiten werden später automatisch analysiert.",
      };

    default:
      return {
        tool: "unbekannt",
        antwort:
          "Ich konnte noch kein passendes NOVA-Modul erkennen. Formuliere die Anfrage bitte etwas genauer.",
      };
  }
}