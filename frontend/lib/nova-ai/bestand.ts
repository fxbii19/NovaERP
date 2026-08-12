type ArtikelStatistik = {
  gesamt: number;
  aktive: number;
  gesperrte: number;
  unterMindestbestand: number;
  bestandGesamt: number;
  reserviertGesamt: number;
  verfuegbarGesamt: number;
};

function zahlFormatieren(wert: number): string {
  return new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 2,
  }).format(wert);
}

export async function bestandAntwort(): Promise<string> {
  try {
    const response = await fetch(
      "http://localhost:3000/api/artikel/statistik",
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error("Bestandsstatistik konnte nicht geladen werden.");
    }

    const statistik = (await response.json()) as ArtikelStatistik;

    return [
      "📦 Bestandsauswertung",
      "",
      `• Artikel gesamt: ${zahlFormatieren(statistik.gesamt)}`,
      `• Aktive Artikel: ${zahlFormatieren(statistik.aktive)}`,
      `• Gesperrte Artikel: ${zahlFormatieren(statistik.gesperrte)}`,
      `• Unter Mindestbestand: ${zahlFormatieren(
        statistik.unterMindestbestand
      )}`,
      "",
      `• Bestand gesamt: ${zahlFormatieren(statistik.bestandGesamt)}`,
      `• Reserviert: ${zahlFormatieren(statistik.reserviertGesamt)}`,
      `• Verfügbar: ${zahlFormatieren(statistik.verfuegbarGesamt)}`,
    ].join("\n");
  } catch (error) {
    console.error("Bestandsantwort fehlgeschlagen:", error);

    return "❌ Die Bestandsdaten konnten nicht geladen werden.";
  }
}