import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { administratorAnfordern } from "@/lib/auth-server";
import { produktnameOhneVariante } from "@/lib/artikelname";

type ImportArtikel = {
  artikelnummer?: unknown;
  produktname?: unknown;
  suchbegriff?: unknown;
  groesse?: unknown;
  variante?: unknown;

  physischerBestand?: unknown;
  physischReserviert?: unknown;
  physischVerfuegbar?: unknown;
  insgesamtBestellt?: unknown;
  inAuftrag?: unknown;
  lagerortverwaltung?: unknown;

  bestand?: unknown;
  reserviert?: unknown;
  verfuegbar?: unknown;
  bestellt?: unknown;
  mindestbestand?: unknown;
};

function textLesen(wert: unknown): string {
  return String(wert ?? "").trim();
}

function zahlLesen(wert: unknown): number {
  if (typeof wert === "number") {
    return Number.isFinite(wert) ? wert : 0;
  }

  const text = String(wert ?? "")
    .trim()
    .replace(/\s/g, "");

  if (!text) {
    return 0;
  }

  const normalisiert =
    text.includes(",")
      ? text.replace(/\./g, "").replace(",", ".")
      : text;

  const zahl = Number(normalisiert);

  return Number.isFinite(zahl) ? zahl : 0;
}

function boolLesen(
  wert: unknown,
  standardwert = true,
): boolean {
  if (typeof wert === "boolean") {
    return wert;
  }

  if (wert === null || wert === undefined || wert === "") {
    return standardwert;
  }

  const text = String(wert).trim().toLowerCase();

  return !["false", "0", "nein", "inaktiv"].includes(text);
}

export async function POST(request: NextRequest) {
  try {
    const admin = await administratorAnfordern();
    if (!admin) {
      return NextResponse.json(
        {
          fehler:
            "Nur Administratoren dürfen Bestandsdaten importieren.",
        },
        {
          status: 403,
        },
      );
    }

    const body = await request.json();

    const ersetzen =
      !Array.isArray(body) && body.ersetzen === true;

    const importArtikel: ImportArtikel[] = Array.isArray(body)
      ? body
      : body.artikel;

    if (!Array.isArray(importArtikel)) {
      return NextResponse.json(
        {
          fehler:
            "Es wurde keine gültige Artikelliste übermittelt.",
        },
        {
          status: 400,
        },
      );
    }

    const gueltigeArtikel = importArtikel
      .map((eintrag) => {
        const artikelnummer = textLesen(
          eintrag.artikelnummer,
        );

        const variante = textLesen(eintrag.variante) || null;
        const produktname = produktnameOhneVariante(
          textLesen(eintrag.produktname),
          variante,
        );

        const bestand = zahlLesen(
          eintrag.bestand ?? eintrag.physischerBestand,
        );

        const reserviert = zahlLesen(
          eintrag.reserviert ??
            eintrag.physischReserviert,
        );

        const verfuegbar = zahlLesen(
          eintrag.verfuegbar ??
            eintrag.physischVerfuegbar ??
            bestand - reserviert,
        );

        const bestellt = zahlLesen(
          eintrag.bestellt ??
            eintrag.insgesamtBestellt,
        );

        return {
          artikelnummer,
          produktname,
          suchbegriff:
            textLesen(eintrag.suchbegriff) || null,
          groesse:
            textLesen(eintrag.groesse) || null,
          variante,
          bestand,
          reserviert,
          verfuegbar,
          bestellt,
          inAuftrag: zahlLesen(eintrag.inAuftrag),
          mindestbestand: zahlLesen(
            eintrag.mindestbestand,
          ),
          lagerortverwaltung: boolLesen(
            eintrag.lagerortverwaltung,
          ),
        };
      })
      .filter(
        (eintrag) =>
          eintrag.artikelnummer &&
          eintrag.produktname,
      );

    if (gueltigeArtikel.length === 0) {
      return NextResponse.json(
        {
          fehler:
            "Die Excel-Datei enthält keine gültigen Artikel.",
        },
        {
          status: 400,
        },
      );
    }

    const blockGroesse = 200;

    if (ersetzen) {
      await prisma.$transaction(
        async (transaktion) => {
          // Historisch verwendete Artikel dürfen wegen ihrer Verknüpfungen
          // nicht gelöscht werden. Beim vollständigen Ersatz werden sie
          // deshalb zunächst deaktiviert und anschließend die importierten
          // Datensätze aktualisiert oder neu angelegt.
          await transaktion.artikel.updateMany({
            data: {
              aktiv: false,
              bestand: 0,
              reserviert: 0,
              verfuegbar: 0,
              bestellt: 0,
              inAuftrag: 0,
            },
          });

          for (
            let index = 0;
            index < gueltigeArtikel.length;
            index += blockGroesse
          ) {
            const block = gueltigeArtikel.slice(
              index,
              index + blockGroesse,
            );

            await Promise.all(
              block.map((eintrag) =>
                transaktion.artikel.upsert({
                  where: {
                    artikelnummer: eintrag.artikelnummer,
                  },
                  update: {
                    ...eintrag,
                    aktiv: true,
                  },
                  create: {
                    ...eintrag,
                    aktiv: true,
                  },
                }),
              ),
            );
          }
        },
        {
          maxWait: 10_000,
          timeout: 60_000,
        },
      );

      return NextResponse.json({
        erfolg: true,
        ersetzt: true,
        importiert: gueltigeArtikel.length,
        uebersprungen:
          importArtikel.length -
          gueltigeArtikel.length,
      });
    }

    for (
      let index = 0;
      index < gueltigeArtikel.length;
      index += blockGroesse
    ) {
      const block = gueltigeArtikel.slice(
        index,
        index + blockGroesse,
      );

      await prisma.$transaction(
        block.map((eintrag) =>
          prisma.artikel.upsert({
            where: {
              artikelnummer: eintrag.artikelnummer,
            },
            update: {
              produktname: eintrag.produktname,
              suchbegriff: eintrag.suchbegriff,
              groesse: eintrag.groesse,
              variante: eintrag.variante,
              bestand: eintrag.bestand,
              reserviert: eintrag.reserviert,
              verfuegbar: eintrag.verfuegbar,
              bestellt: eintrag.bestellt,
              inAuftrag: eintrag.inAuftrag,
              mindestbestand:
                eintrag.mindestbestand,
              lagerortverwaltung:
                eintrag.lagerortverwaltung,
              aktiv: true,
            },
            create: {
              artikelnummer: eintrag.artikelnummer,
              produktname: eintrag.produktname,
              suchbegriff: eintrag.suchbegriff,
              groesse: eintrag.groesse,
              variante: eintrag.variante,
              bestand: eintrag.bestand,
              reserviert: eintrag.reserviert,
              verfuegbar: eintrag.verfuegbar,
              bestellt: eintrag.bestellt,
              inAuftrag: eintrag.inAuftrag,
              mindestbestand:
                eintrag.mindestbestand,
              lagerortverwaltung:
                eintrag.lagerortverwaltung,
              aktiv: true,
            },
          }),
        ),
      );
    }

    return NextResponse.json({
      erfolg: true,
      importiert: gueltigeArtikel.length,
      uebersprungen:
        importArtikel.length -
        gueltigeArtikel.length,
    });
  } catch (error) {
    const technischeMeldung =
      error instanceof Error
        ? error.message
        : "Unbekannter Datenbankfehler";

    console.error(
      "Fehler beim Artikelimport:",
      error,
    );

    return NextResponse.json(
      {
        fehler:
          `Die Artikel konnten nicht in die Datenbank importiert werden: ${technischeMeldung}`,
      },
      {
        status: 500,
      },
    );
  }
}
