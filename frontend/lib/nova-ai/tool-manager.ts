import type { NovaAnfrage } from "./anfrage-parser";
import { bestandAntwort } from "./bestand";
import { bestellungenAntwort } from "./bestellungen";
import { dashboardAntwort } from "./dashboard";
import { inventurAntwort } from "./inventur";
import { diagnoseAntwort } from "./diagnose";

export async function toolAusfuehren(
  anfrage: NovaAnfrage
): Promise<string> {

  if (anfrage.intent === "DIAGNOSE") {
  return diagnoseAntwort(anfrage);
}

  switch (anfrage.modul) {
    case "bestand":
      return bestandTool(anfrage);

    case "bestellungen":
      return bestellungenTool(anfrage);

    case "dashboard":
      return dashboardAntwort();

    case "qs":
      return '🔧 Das Modul "QS" ist registriert, aber noch nicht entwickelt.';

    case "versand":
      return '🔧 Das Modul "Versand" ist registriert, aber noch nicht entwickelt.';

    case "inventur":
      return inventurAntwort();

    default:
      return "❌ Ich konnte kein passendes NOVA-Modul erkennen.";
  }
}

async function bestandTool(
  anfrage: NovaAnfrage
): Promise<string> {
  console.log("BESTAND TOOL:", anfrage);

  const lager = anfrage.parameter.lager;

  if (lager) {
    return `📦 Der Bestand im Lager ${lager.toUpperCase()} wird später separat ausgewertet.`;
  }

  return bestandAntwort();
}

async function bestellungenTool(
  anfrage: NovaAnfrage
): Promise<string> {
  if (
    anfrage.aktion === "offen" ||
    anfrage.parameter.status === "offen"
  ) {
    return bestellungenAntwort("offene bestellungen");
  }

  if (anfrage.parameter.lieferant) {
    return `🏢 Bestellungen des Lieferanten ${anfrage.parameter.lieferant} werden geprüft.`;
  }

  return bestellungenAntwort(anfrage.aktion);
}
