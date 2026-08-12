type BestellungsStatistik = {
  gesamt: number;
  offen: number;
  abgeschlossen: number;
  storniert: number;
};

export async function bestellungenAntwort(
  frage: string
): Promise<string> {
  const text = frage.toLowerCase();

  try {
    const response = await fetch("/api/bestellungen/statistik");

    if (!response.ok) {
      throw new Error(
        `Statistik konnte nicht geladen werden: ${response.status}`
      );
    }

    const statistik =
      (await response.json()) as BestellungsStatistik;

    if (text.includes("offen")) {
      return `📋 Aktuell gibt es ${statistik.offen} offene Bestellungen.`;
    }

    if (text.includes("lieferant")) {
      return statistik.offen === 1
  ? "📋 Aktuell gibt es 1 offene Bestellung."
  : `📋 Aktuell gibt es ${statistik.offen} offene Bestellungen.`;
    }

    return [
      "📦 Bestellungsstatistik:",
      `• Gesamt: ${statistik.gesamt}`,
      `• Offen: ${statistik.offen}`,
      `• Abgeschlossen: ${statistik.abgeschlossen}`,
      `• Storniert: ${statistik.storniert}`,
    ].join("\n");
  } catch (error) {
    console.error("BESTELLUNGEN TOOL:", error);

    return "❌ Die Bestellungsdaten konnten nicht geladen werden.";
  }
}