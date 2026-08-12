import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aktuellerBenutzer, administratorAnfordern } from "@/lib/auth-server";
import { auditSpeichern } from "@/lib/audit";

export async function GET() {
  try {
    const angemeldet = await aktuellerBenutzer();
    if (!angemeldet) return NextResponse.json({ fehler: "Anmeldung erforderlich." }, { status: 401 });
    const artikel = await prisma.artikel.findMany({
      where: {
        aktiv: true,
      },
      orderBy: {
        produktname: "asc",
      },
    });

    return NextResponse.json(artikel);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        fehler: "Artikel konnten nicht geladen werden.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await administratorAnfordern();
    if (!admin) {
      return NextResponse.json(
        {
          fehler: "Nur Administratoren dürfen Artikel anlegen.",
        },
        {
          status: 403,
        },
      );
    }

    const daten = await request.json();

    const artikelnummer = String(
      daten.artikelnummer ?? "",
    ).trim();

    const produktname = String(
      daten.produktname ?? "",
    ).trim();

    if (!artikelnummer || !produktname) {
      return NextResponse.json(
        {
          fehler:
            "Artikelnummer und Produktname sind erforderlich.",
        },
        {
          status: 400,
        },
      );
    }

    const vorhandenerArtikel =
      await prisma.artikel.findUnique({
        where: {
          artikelnummer,
        },
      });

    if (vorhandenerArtikel) {
      return NextResponse.json(
        {
          fehler:
            "Ein Artikel mit dieser Artikelnummer existiert bereits.",
        },
        {
          status: 409,
        },
      );
    }

    const bestand = Number(daten.bestand ?? 0);
    const reserviert = Number(daten.reserviert ?? 0);

    const neuerArtikel = await prisma.artikel.create({
      data: {
        artikelnummer,
        produktname,
        suchbegriff: daten.suchbegriff
          ? String(daten.suchbegriff).trim()
          : null,
        groesse: daten.groesse
          ? String(daten.groesse).trim()
          : null,
        variante: daten.variante
          ? String(daten.variante).trim()
          : null,
        bestand,
        reserviert,
        verfuegbar:
          daten.verfuegbar !== undefined
            ? Number(daten.verfuegbar)
            : bestand - reserviert,
        bestellt: Number(daten.bestellt ?? 0),
        inAuftrag: Number(daten.inAuftrag ?? 0),
        mindestbestand: Number(
          daten.mindestbestand ?? 0,
        ),
        lagerortverwaltung:
          daten.lagerortverwaltung !== false,
        aktiv: daten.aktiv !== false,
      },
    });

    await auditSpeichern({ modul: "Artikel", aktion: "Artikel angelegt", benutzer: `${admin.vorname} ${admin.nachname}`, objektTyp: "Artikel", objektId: neuerArtikel.id, alterWert: null, neuerWert: neuerArtikel, grund: String(daten.grund ?? "Neuanlage") });

    return NextResponse.json(neuerArtikel, {
      status: 201,
    });
  } catch (error) {
    console.error("Artikel konnte nicht angelegt werden:", error);

    return NextResponse.json(
      {
        fehler: "Der Artikel konnte nicht angelegt werden.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await administratorAnfordern();
    if (!admin) {
      return NextResponse.json(
        { fehler: "Nur Administratoren dürfen Artikel bearbeiten." },
        { status: 403 },
      );
    }

    const daten = await request.json();
    const ids = Array.isArray(daten.ids)
      ? daten.ids.map(Number).filter(Number.isInteger)
      : Number.isInteger(Number(daten.id))
        ? [Number(daten.id)]
        : [];

    if (ids.length === 0) {
      return NextResponse.json(
        { fehler: "Es wurde kein gültiger Artikel ausgewählt." },
        { status: 400 },
      );
    }

    const aenderungen: {
      produktname?: string;
      suchbegriff?: string | null;
      groesse?: string | null;
      variante?: string | null;
      bestand?: number;
      reserviert?: number;
      verfuegbar?: number;
      bestellt?: number;
      inAuftrag?: number;
      mindestbestand?: number;
      lagerortverwaltung?: boolean;
      aktiv?: boolean;
    } = {};

    for (const feld of [
      "bestand",
      "reserviert",
      "bestellt",
      "inAuftrag",
      "mindestbestand",
    ] as const) {
      if (daten[feld] !== undefined) {
        const wert = Number(daten[feld]);

        if (!Number.isFinite(wert)) {
          return NextResponse.json(
            { fehler: `${feld} enthält keinen gültigen Zahlenwert.` },
            { status: 400 },
          );
        }

        aenderungen[feld] = wert;
      }
    }

    if (daten.produktname !== undefined) {
      const produktname = String(daten.produktname).trim();

      if (!produktname) {
        return NextResponse.json(
          { fehler: "Der Produktname darf nicht leer sein." },
          { status: 400 },
        );
      }

      aenderungen.produktname = produktname;
    }

    for (const feld of [
      "suchbegriff",
      "groesse",
      "variante",
    ] as const) {
      if (daten[feld] !== undefined) {
        const wert = String(daten[feld]).trim();
        aenderungen[feld] = wert || null;
      }
    }

    if (daten.lagerortverwaltung !== undefined) {
      aenderungen.lagerortverwaltung = Boolean(daten.lagerortverwaltung);
    }

    if (daten.aktiv !== undefined) {
      aenderungen.aktiv = Boolean(daten.aktiv);
    }

    if (ids.length === 1 && daten.bestand !== undefined) {
      const reserviert =
        daten.reserviert !== undefined
          ? Number(daten.reserviert)
          : (
              await prisma.artikel.findUnique({ where: { id: ids[0] } })
            )?.reserviert ?? 0;
      aenderungen.verfuegbar = Number(daten.bestand) - reserviert;
    }

    const vorher = await prisma.artikel.findMany({ where: { id: { in: ids } } });
    const ergebnis = await prisma.artikel.updateMany({
      where: { id: { in: ids } },
      data: aenderungen,
    });

    const nachher = await prisma.artikel.findMany({ where: { id: { in: ids } } });
    await auditSpeichern({ modul: "Artikel", aktion: ids.length === 1 ? "Artikel geändert" : "Artikel gesammelt geändert", benutzer: `${admin.vorname} ${admin.nachname}`, objektTyp: "Artikel", objektId: ids.join(","), alterWert: vorher, neuerWert: nachher, grund: String(daten.grund ?? "Stammdatenpflege") });

    return NextResponse.json({ aktualisiert: ergebnis.count });
  } catch (error) {
    console.error("Artikel konnten nicht bearbeitet werden:", error);

    return NextResponse.json(
      { fehler: "Die Artikel konnten nicht bearbeitet werden." },
      { status: 500 },
    );
  }
}
