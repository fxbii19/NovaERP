import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aktuellerBenutzer } from "@/lib/auth-server";

export async function GET() {
  try {
    const benutzer = await aktuellerBenutzer();
    if (!benutzer) return NextResponse.json({ fehler: "Bitte erneut anmelden." }, { status: 401 });
    const jetzt = new Date();
    const [artikel, vorschlaege, auftraege, offeneBestellungen] = await Promise.all([
      prisma.artikel.findMany({ where: { aktiv: true }, orderBy: { verfuegbar: "asc" } }),
      prisma.dispositionsvorschlag.findMany({ include: { artikel: true }, orderBy: { erstelltAm: "desc" }, take: 500 }),
      prisma.logistikauftrag.findMany({ where: { liefertermin: { not: null }, status: { notIn: ["VERSENDET", "ABGESCHLOSSEN", "STORNIERT"] } }, include: { positionen: { include: { artikel: true } } }, orderBy: { liefertermin: "asc" }, take: 200 }),
      prisma.bestellung.count({ where: { status: "Offen" } }),
    ]);
    const bedarfe = artikel.filter((a) => a.verfuegbar < a.mindestbestand || a.verfuegbar < 0).slice(0, 500);
    const termine = auftraege.map((a) => ({ ...a, ueberfaellig: Boolean(a.liefertermin && a.liefertermin < jetzt) }));
    return NextResponse.json({ bedarfe, vorschlaege, termine, offeneBestellungen });
  } catch (error) {
    console.error("Disposition konnte nicht geladen werden:", error);
    return NextResponse.json({ fehler: "Die Dispositionsdaten konnten nicht geladen werden." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const benutzer = await aktuellerBenutzer();
    if (!benutzer) return NextResponse.json({ fehler: "Bitte erneut anmelden." }, { status: 401 });
    const daten = await request.json();
    const aktion = String(daten.aktion ?? "");

    if (aktion === "vorschlaege-erzeugen") {
      const artikel = await prisma.artikel.findMany({ where: { aktiv: true } });
      const kritisch = artikel.filter((a) => a.verfuegbar < a.mindestbestand);
      const vorhandene = await prisma.dispositionsvorschlag.findMany({ where: { status: "NEU" }, select: { artikelId: true } });
      const ids = new Set(vorhandene.map((v) => v.artikelId));
      const neu = kritisch.filter((a) => !ids.has(a.id)).slice(0, 250).map((a) => ({ artikelId: a.id, vorgeschlageneMenge: Math.max(1, Math.ceil(a.mindestbestand * 2 - a.verfuegbar)), begruendung: `Verfügbar ${a.verfuegbar.toLocaleString("de-DE")} · Mindestbestand ${a.mindestbestand.toLocaleString("de-DE")}`, erstelltVon: `${benutzer.vorname} ${benutzer.nachname}` }));
      if (neu.length) await prisma.dispositionsvorschlag.createMany({ data: neu });
      return NextResponse.json({ erstellt: neu.length });
    }

    if (aktion === "vorschlag-status") {
      const status = String(daten.status ?? "").toUpperCase();
      if (!["NEU", "FREIGEGEBEN", "ABGELEHNT", "BESTELLT"].includes(status)) return NextResponse.json({ fehler: "Ungültiger Status." }, { status: 400 });
      return NextResponse.json(await prisma.dispositionsvorschlag.update({ where: { id: Number(daten.id) }, data: { status, bearbeitetAm: new Date() } }));
    }
    return NextResponse.json({ fehler: "Unbekannte Aktion." }, { status: 400 });
  } catch (error) {
    console.error("Dispositionsaktion fehlgeschlagen:", error);
    return NextResponse.json({ fehler: "Der Vorgang konnte nicht gespeichert werden." }, { status: 500 });
  }
}
