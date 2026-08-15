import { NextRequest, NextResponse } from "next/server";
import { administratorAnfordern } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

const SZENARIEN = {
  lieferant: { titel: "Lieferant ausgefallen", details: "Der Demo-Lieferant NOVA Components ist kurzfristig nicht lieferfähig.", stufe: "KRITISCH" },
  server: { titel: "ERP-Schnittstelle offline", details: "Die externe API-Verbindung zum Partnersystem antwortet nicht.", stufe: "FEHLER" },
  artikel: { titel: "Artikel fehlt", details: "Der Testartikel CHAOS-ART-404 besitzt keinen verfügbaren Bestand.", stufe: "KRITISCH" },
  lkw: { titel: "LKW verspätet", details: "Die Testladung CHAOS-LKW-01 hat die geplante Abfahrt überschritten.", stufe: "KRITISCH" },
} as const;

type Szenario = keyof typeof SZENARIEN;

async function statusLaden() {
  const protokolle = await prisma.systemprotokoll.findMany({
    where: { modul: "CHAOS_MODE" },
    orderBy: { erstelltAm: "desc" },
  });
  return Object.keys(SZENARIEN).map((id) => ({
    id,
    ...SZENARIEN[id as Szenario],
    aktiv: protokolle.some((protokoll) => protokoll.objektId === id && protokoll.aktion === "SIMULATION_AKTIV"),
  }));
}

export async function GET() {
  if (!await administratorAnfordern()) return NextResponse.json({ fehler: "Nur Administratoren dürfen den Chaos Mode verwenden." }, { status: 403 });
  return NextResponse.json({ szenarien: await statusLaden() });
}

export async function POST(request: NextRequest) {
  const admin = await administratorAnfordern();
  if (!admin) return NextResponse.json({ fehler: "Nur Administratoren dürfen den Chaos Mode verwenden." }, { status: 403 });
  const daten = await request.json();
  const aktion = String(daten.aktion ?? "");
  const benutzer = `${admin.vorname} ${admin.nachname}`.trim();

  if (aktion === "zuruecksetzen") {
    await prisma.$transaction([
      prisma.systemprotokoll.deleteMany({ where: { modul: "CHAOS_MODE" } }),
      prisma.bestellung.deleteMany({ where: { bestellnummer: "CHAOS-EK-LIEFERANT" } }),
      prisma.ladung.deleteMany({ where: { ladungsnummer: "CHAOS-LKW-01" } }),
      prisma.artikel.deleteMany({ where: { artikelnummer: "CHAOS-ART-404" } }),
    ]);
    return NextResponse.json({ erfolg: true, szenarien: await statusLaden() });
  }

  const szenario = String(daten.szenario ?? "") as Szenario;
  if (!(szenario in SZENARIEN)) return NextResponse.json({ fehler: "Unbekanntes Chaos-Szenario." }, { status: 400 });

  if (szenario === "lieferant") {
    await prisma.bestellung.upsert({ where: { bestellnummer: "CHAOS-EK-LIEFERANT" }, update: { status: "Offen", lieferant: "NOVA Components (AUSGEFALLEN)" }, create: { bestellnummer: "CHAOS-EK-LIEFERANT", lieferant: "NOVA Components (AUSGEFALLEN)", status: "Offen", gesamtpositionen: 3 } });
  }
  if (szenario === "artikel") {
    await prisma.artikel.upsert({ where: { artikelnummer: "CHAOS-ART-404" }, update: { bestand: 0, verfuegbar: 0, mindestbestand: 25, aktiv: true }, create: { artikelnummer: "CHAOS-ART-404", produktname: "Chaos-Testartikel – nicht verfügbar", suchbegriff: "CHAOS FEHLTEIL", bestand: 0, verfuegbar: 0, mindestbestand: 25, verkaufspreis: 89.9 } });
  }
  if (szenario === "lkw") {
    const abfahrt = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await prisma.ladung.upsert({ where: { ladungsnummer: "CHAOS-LKW-01" }, update: { status: "VERSPAETET", abfahrt, rampe: "R3" }, create: { ladungsnummer: "CHAOS-LKW-01", status: "VERSPAETET", spediteur: "NOVA Testspedition", kennzeichen: "NOVA-404", rampe: "R3", ziel: "Berlin", abfahrt, erstelltVon: benutzer } });
  }

  const info = SZENARIEN[szenario];
  await prisma.systemprotokoll.deleteMany({ where: { modul: "CHAOS_MODE", objektId: szenario } });
  await prisma.systemprotokoll.create({ data: { modul: "CHAOS_MODE", aktion: "SIMULATION_AKTIV", details: `${info.titel}: ${info.details}`, stufe: info.stufe, benutzer, objektTyp: "CHAOS_SZenario", objektId: szenario, grund: "Absichtlicher Systemtest durch einen Administrator" } });
  return NextResponse.json({ erfolg: true, szenarien: await statusLaden() });
}
