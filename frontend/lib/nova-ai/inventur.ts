type InventurStatistik = {
  gesamt: number;
  mitBestand: number;
  ohneBestand: number;
  gesperrte: number;
  unterMindestbestand: number;
  bestandGesamt: number;
};

function zahlFormatieren(wert: number): string {
  return wert.toLocaleString("de-DE", {
    maximumFractionDigits: 2,
  });
}

export async function inventurAntwort(): Promise<string> {
  try {
    const response = await fetch("/api/inventur/statistik", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Inventurdaten konnten nicht geladen werden: ${response.status}`,
      );
    }

    const statistik =
      (await response.json()) as InventurStatistik;

    return [
      "📋 Inventurübersicht",
      "",
      `• Artikel gesamt: ${zahlFormatieren(statistik.gesamt)}`,
      `• Artikel mit Bestand: ${zahlFormatieren(statistik.mitBestand)}`,
      `• Artikel ohne Bestand: ${zahlFormatieren(statistik.ohneBestand)}`,
      `• Unter Mindestbestand: ${zahlFormatieren(statistik.unterMindestbestand)}`,
      `• Gesperrte Artikel: ${zahlFormatieren(statistik.gesperrte)}`,
      `• Physischer Gesamtbestand: ${zahlFormatieren(statistik.bestandGesamt)}`,
    ].join("\n");
  } catch (error) {
    console.error("INVENTUR TOOL:", error);

    return "❌ Die Inventurdaten konnten nicht geladen werden.";
  }
}
