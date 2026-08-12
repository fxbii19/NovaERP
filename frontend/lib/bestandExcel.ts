import * as XLSX from "xlsx";

export type BestandArtikel = {
  id: string;
  produktname: string;
  suchbegriff: string;
  artikelnummer: string;
  groesse: string;
  variante: string;

  physischerBestand: number;
  physischReserviert: number;
  physischVerfuegbar: number;
  exaktVerfuegbar: number;

  insgesamtBestellt: number;
  inAuftrag: number;
  bestelltReserviert: number;
  verfuegbareMenge: number;

  lagerortverwaltung: boolean;
};

type ExcelBestandZeile = {
  Produktname?: unknown;
  Suchbegriff?: unknown;
  Artikelnummer?: unknown;
  "Physischer Bestand"?: unknown;
  "Physisch reserviert"?: unknown;
  "Physisch verfügbar"?: unknown;
  "Physisch in exakten Dimensionen verfügbar"?: unknown;
  "Insgesamt bestellt"?: unknown;
  "In Auftrag"?: unknown;
  "Bestellt reserviert"?: unknown;
  "Verfügbare Menge"?: unknown;
  "Verwendet Lagerortverwaltungsprozesse"?: unknown;
  "Größe"?: unknown;
  Variante?: unknown;
};

export type BestandImportErgebnis = {
  artikel: BestandArtikel[];
  dauerInMillisekunden: number;
  anzahlZeilen: number;
};

function alsText(wert: unknown): string {
  if (wert === null || wert === undefined) {
    return "";
  }

  return String(wert).trim();
}

function alsZahl(wert: unknown): number {
  if (typeof wert === "number") {
    return Number.isFinite(wert) ? wert : 0;
  }

  if (typeof wert !== "string") {
    return 0;
  }

  const bereinigt = wert
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const zahl = Number(bereinigt);

  return Number.isFinite(zahl) ? zahl : 0;
}

function alsBoolean(wert: unknown): boolean {
  const text = alsText(wert).toLowerCase();

  return (
    text === "ja" ||
    text === "true" ||
    text === "1" ||
    text === "yes"
  );
}

export async function bestandAusExcelLesen(
  datei: File,
): Promise<BestandImportErgebnis> {
  const startzeit = performance.now();

  const dateiPuffer = await datei.arrayBuffer();

  const arbeitsmappe = XLSX.read(dateiPuffer, {
    type: "array",
    cellDates: false,
    dense: true,
  });

  const erstesBlatt = arbeitsmappe.SheetNames[0];

  if (!erstesBlatt) {
    throw new Error("Die Excel-Datei enthält kein Tabellenblatt.");
  }

  const tabellenblatt = arbeitsmappe.Sheets[erstesBlatt];

  if (!tabellenblatt) {
    throw new Error(
      "Das erste Tabellenblatt konnte nicht gelesen werden.",
    );
  }

  const zeilen = XLSX.utils.sheet_to_json<ExcelBestandZeile>(
    tabellenblatt,
    {
      defval: null,
      raw: true,
    },
  );

  const artikel = zeilen
    .map((zeile, index): BestandArtikel => {
      const artikelnummer = alsText(zeile.Artikelnummer);

      return {
        id: artikelnummer || `excel-${index + 1}`,

        produktname: alsText(zeile.Produktname),
        suchbegriff: alsText(zeile.Suchbegriff),
        artikelnummer,
        groesse: alsText(zeile["Größe"]),
        variante: alsText(zeile.Variante),

        physischerBestand: alsZahl(
          zeile["Physischer Bestand"],
        ),

        physischReserviert: alsZahl(
          zeile["Physisch reserviert"],
        ),

        physischVerfuegbar: alsZahl(
          zeile["Physisch verfügbar"],
        ),

        exaktVerfuegbar: alsZahl(
          zeile[
            "Physisch in exakten Dimensionen verfügbar"
          ],
        ),

        insgesamtBestellt: alsZahl(
          zeile["Insgesamt bestellt"],
        ),

        inAuftrag: alsZahl(
          zeile["In Auftrag"],
        ),

        bestelltReserviert: alsZahl(
          zeile["Bestellt reserviert"],
        ),

        verfuegbareMenge: alsZahl(
          zeile["Verfügbare Menge"],
        ),

        lagerortverwaltung: alsBoolean(
          zeile[
            "Verwendet Lagerortverwaltungsprozesse"
          ],
        ),
      };
    })
    .filter((artikel) => {
      return (
        artikel.artikelnummer !== "" ||
        artikel.produktname !== ""
      );
    });

  const endzeit = performance.now();

  return {
    artikel,
    anzahlZeilen: artikel.length,
    dauerInMillisekunden: endzeit - startzeit,
  };
}
