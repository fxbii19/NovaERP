type BestellStatistik = {
  gesamt: number;
  offen: number;
  abgeschlossen: number;
  storniert: number;
};

function format(wert: number) {
  return new Intl.NumberFormat("de-DE").format(wert);
}

export async function bestellungenAntwort(): Promise<string> {
  try {
    const response = await fetch(
      "http://localhost:3000/api/bestellungen/statistik",
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error();
    }

    const statistik =
      (await response.json()) as BestellStatistik;

    return [
      "📋 Bestellübersicht",
      "",
      `• Gesamt: ${format(statistik.gesamt)}`,
      `• Offen: ${format(statistik.offen)}`,
      `• Abgeschlossen: ${format(statistik.abgeschlossen)}`,
      `• Storniert: ${format(statistik.storniert)}`,
    ].join("\n");
  } catch {
    return "❌ Bestellungen konnten nicht geladen werden.";
  }
}