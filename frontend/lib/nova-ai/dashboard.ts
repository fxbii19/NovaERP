type ArtikelStatistik = {
  gesamt: number;
  aktive: number;
  gesperrte: number;
  unterMindestbestand: number;
  bestandGesamt: number;
  reserviertGesamt: number;
  verfuegbarGesamt: number;
};

type BestellungsStatistik = {
  gesamt: number;
  offen: number;
  abgeschlossen: number;
  storniert: number;
};

function zahlFormatieren(wert: number): string {
  return wert.toLocaleString("de-DE", {
    maximumFractionDigits: 2,
  });
}

export async function dashboardAntwort(): Promise<string> {
  try {
    const [artikelResponse, bestellungenResponse] =
      await Promise.all([
        fetch("/api/artikel/statistik", {
          cache: "no-store",
        }),
        fetch("/api/bestellungen/statistik", {
          cache: "no-store",
        }),
      ]);

    if (!artikelResponse.ok || !bestellungenResponse.ok) {
      throw new Error("Dashboard-Daten konnten nicht geladen werden.");
    }

    const artikel =
      (await artikelResponse.json()) as ArtikelStatistik;
    const bestellungen =
      (await bestellungenResponse.json()) as BestellungsStatistik;

    return [
      "📊 NOVA Dashboard",
      "",
      "📦 Artikelbestand",
      `• Artikel: ${zahlFormatieren(artikel.gesamt)}`,
      `• Aktive Artikel: ${zahlFormatieren(artikel.aktive)}`,
      `• Gesperrte Artikel: ${zahlFormatieren(artikel.gesperrte)}`,
      `• Unter Mindestbestand: ${zahlFormatieren(artikel.unterMindestbestand)}`,
      `• Physischer Bestand: ${zahlFormatieren(artikel.bestandGesamt)}`,
      `• Reserviert: ${zahlFormatieren(artikel.reserviertGesamt)}`,
      `• Verfügbar: ${zahlFormatieren(artikel.verfuegbarGesamt)}`,
      "",
      "📋 Bestellungen",
      `• Gesamt: ${zahlFormatieren(bestellungen.gesamt)}`,
      `• Offen: ${zahlFormatieren(bestellungen.offen)}`,
      `• Abgeschlossen: ${zahlFormatieren(bestellungen.abgeschlossen)}`,
      `• Storniert: ${zahlFormatieren(bestellungen.storniert)}`,
    ].join("\n");
  } catch (error) {
    console.error("DASHBOARD TOOL:", error);

    return "❌ Die Dashboard-Daten konnten nicht geladen werden.";
  }
}
