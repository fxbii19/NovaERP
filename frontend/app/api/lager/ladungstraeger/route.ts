import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aktuellerBenutzer } from "@/lib/auth-server";
import {
  ladungstraegerBarcode,
  ladungstraegerBarcodeLesen,
  ladungstraegerMengen,
} from "@/lib/ladungstraeger-aufteilung";

async function standardLagerplatz(artikelId: number) {
  const bestand = await prisma.lagerbestand.findFirst({
    where: { artikelId, menge: { gt: 0 }, lagerplatz: { aktiv: true } },
    orderBy: { menge: "desc" },
    include: { lagerplatz: true },
  });

  if (bestand) return bestand.lagerplatz;

  return prisma.lagerplatz.findFirst({
    where: { aktiv: true },
    orderBy: { code: "asc" },
  });
}

export async function GET(request: NextRequest) {
  try {
    if (!(await aktuellerBenutzer())) {
      return NextResponse.json({ fehler: "Anmeldung erforderlich." }, { status: 401 });
    }

    const barcode = request.nextUrl.searchParams.get("barcode")?.trim();
    const artikelIdParameter = request.nextUrl.searchParams.get("artikelId");

    if (barcode) {
      const vorhandener = await prisma.ladungstraeger.findUnique({
        where: { barcode },
        include: {
          lagerplatz: true,
          positionen: { include: { artikel: true } },
        },
      });

      if (vorhandener) return NextResponse.json(vorhandener);

      const schluessel = ladungstraegerBarcodeLesen(barcode);
      if (!schluessel) {
        return NextResponse.json({ fehler: "Ladungsträger wurde nicht gefunden." }, { status: 404 });
      }

      const artikel = await prisma.artikel.findFirst({
        where: { id: schluessel.artikelId, aktiv: true },
      });
      if (!artikel) {
        return NextResponse.json({ fehler: "Der zugehörige Artikel wurde nicht gefunden." }, { status: 404 });
      }

      const mengen = ladungstraegerMengen(artikel.artikelnummer, artikel.bestand);
      const menge = mengen[schluessel.index];
      if (menge === undefined) {
        return NextResponse.json({ fehler: "Ladungsträger wurde nicht gefunden." }, { status: 404 });
      }

      return NextResponse.json({
        barcode: ladungstraegerBarcode(artikel.id, schluessel.index),
        bezeichnung: `${artikel.artikelnummer} · Träger ${schluessel.index + 1}`,
        virtuell: true,
        lagerplatz: await standardLagerplatz(artikel.id),
        traegerIndex: schluessel.index + 1,
        traegerGesamt: mengen.length,
        positionen: [{ artikel, menge }],
      });
    }

    const artikelId = Number(artikelIdParameter);
    if (!Number.isInteger(artikelId)) {
      return NextResponse.json({ fehler: "Artikel oder Barcode fehlt." }, { status: 400 });
    }

    const artikel = await prisma.artikel.findFirst({ where: { id: artikelId, aktiv: true } });
    if (!artikel) {
      return NextResponse.json({ fehler: "Artikel wurde nicht gefunden." }, { status: 404 });
    }

    const mengen = ladungstraegerMengen(artikel.artikelnummer, artikel.bestand);
    const lagerplatz = await standardLagerplatz(artikel.id);

    return NextResponse.json({
      artikel,
      lagerplatz,
      gesamtmenge: mengen.reduce((summe, menge) => summe + menge, 0),
      ladungstraegerGesamt: mengen.length,
      ladungstraeger: mengen.map((menge, index) => ({
        barcode: ladungstraegerBarcode(artikel.id, index),
        menge,
      })),
    });
  } catch (error) {
    console.error("Ladungsträger konnten nicht geladen werden:", error);
    return NextResponse.json({ fehler: "Ladungsträger konnten nicht geladen werden." }, { status: 500 });
  }
}

