import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aktuellerBenutzer } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  const benutzer = await aktuellerBenutzer();
  if (!benutzer) return NextResponse.json({ fehler: "Anmeldung erforderlich." }, { status: 401 });

  const suchtext = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (suchtext.length < 2) return NextResponse.json({ artikel: [], bestellungen: [], lagerplaetze: [], auftraege: [], lieferscheine: [] });
  const begriffe = suchtext.split(/\s+/).filter(Boolean).slice(0, 8);
  const textFilter = (begriff: string) => ({ contains: begriff, mode: "insensitive" as const });

  try {
    const [artikel, bestellungen, lagerplaetze, auftraege, lieferscheine] = await Promise.all([
      prisma.artikel.findMany({
        where: { aktiv: true, AND: begriffe.map((begriff) => ({ OR: [
          { artikelnummer: textFilter(begriff) }, { produktname: textFilter(begriff) },
          { suchbegriff: textFilter(begriff) }, { groesse: textFilter(begriff) }, { variante: textFilter(begriff) },
        ] })) },
        select: { id: true, artikelnummer: true, produktname: true, groesse: true, variante: true, verfuegbar: true, lagerplatz: true },
        take: 12,
      }),
      prisma.bestellung.findMany({ where: { OR: [{ bestellnummer: textFilter(suchtext) }, { lieferant: textFilter(suchtext) }] }, take: 6, orderBy: { aktualisiertAm: "desc" } }),
      prisma.lagerplatz.findMany({ where: { OR: [{ code: textFilter(suchtext) }, { bezeichnung: textFilter(suchtext) }, { bereich: textFilter(suchtext) }] }, take: 6 }),
      prisma.logistikauftrag.findMany({ where: { OR: [{ auftragsnummer: textFilter(suchtext) }, { kunde: textFilter(suchtext) }, { kundenreferenz: textFilter(suchtext) }] }, take: 6, orderBy: { aktualisiertAm: "desc" } }),
      prisma.lieferschein.findMany({ where: { lieferscheinnummer: textFilter(suchtext) }, include: { versand: { include: { auftrag: true } } }, take: 6, orderBy: { erstelltAm: "desc" } }),
    ]);
    return NextResponse.json({ artikel, bestellungen, lagerplaetze, auftraege, lieferscheine });
  } catch (error) {
    console.error("Globale Suche:", error);
    return NextResponse.json({ fehler: "Die globale Suche ist momentan nicht verfügbar." }, { status: 500 });
  }
}
