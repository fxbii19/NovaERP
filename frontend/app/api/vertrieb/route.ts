import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aktuellerBenutzer } from "@/lib/auth-server";

export async function GET() {
  try {
    const benutzer = await aktuellerBenutzer();
    if (!benutzer) return NextResponse.json({ fehler: "Bitte erneut anmelden." }, { status: 401 });
    const [kunden, angebote] = await Promise.all([
      prisma.kunde.findMany({ orderBy: { firmenname: "asc" } }),
      prisma.angebot.findMany({ include: { kunde: true }, orderBy: { erstelltAm: "desc" } }),
    ]);
    return NextResponse.json({ kunden, angebote });
  } catch (error) {
    console.error("Vertrieb konnte nicht geladen werden:", error);
    return NextResponse.json({ fehler: "Die Vertriebsdaten konnten nicht geladen werden." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const benutzer = await aktuellerBenutzer();
    if (!benutzer) return NextResponse.json({ fehler: "Bitte erneut anmelden." }, { status: 401 });
    const daten = await request.json();
    const aktion = String(daten.aktion ?? "");

    if (aktion === "kunde-anlegen") {
      const firmenname = String(daten.firmenname ?? "").trim();
      if (!firmenname) return NextResponse.json({ fehler: "Der Firmenname wird benötigt." }, { status: 400 });
      const anzahl = await prisma.kunde.count();
      const kunde = await prisma.kunde.create({ data: { kundennummer: `KD-${String(anzahl + 1).padStart(5, "0")}`, firmenname, ansprechpartner: String(daten.ansprechpartner ?? "").trim() || null, email: String(daten.email ?? "").trim() || null, telefon: String(daten.telefon ?? "").trim() || null, ort: String(daten.ort ?? "").trim() || null } });
      return NextResponse.json(kunde);
    }

    if (aktion === "angebot-anlegen") {
      const kundeId = Number(daten.kundeId);
      const titel = String(daten.titel ?? "").trim();
      if (!kundeId || !titel) return NextResponse.json({ fehler: "Kunde und Titel werden benötigt." }, { status: 400 });
      const anzahl = await prisma.angebot.count();
      const angebot = await prisma.angebot.create({ data: { angebotsnummer: `ANG-${new Date().getFullYear()}-${String(anzahl + 1).padStart(4, "0")}`, kundeId, titel, nettowert: Math.max(0, Number(daten.nettowert) || 0), gueltigBis: daten.gueltigBis ? new Date(String(daten.gueltigBis)) : null, erstelltVon: `${benutzer.vorname} ${benutzer.nachname}` } });
      return NextResponse.json(angebot);
    }

    if (aktion === "angebot-status") {
      const erlaubte = ["ENTWURF", "VERSENDET", "ANGENOMMEN", "ABGELEHNT"];
      const status = String(daten.status ?? "").toUpperCase();
      if (!erlaubte.includes(status)) return NextResponse.json({ fehler: "Ungültiger Status." }, { status: 400 });
      return NextResponse.json(await prisma.angebot.update({ where: { id: Number(daten.id) }, data: { status } }));
    }
    return NextResponse.json({ fehler: "Unbekannte Aktion." }, { status: 400 });
  } catch (error) {
    console.error("Vertriebsaktion fehlgeschlagen:", error);
    return NextResponse.json({ fehler: "Der Vorgang konnte nicht gespeichert werden." }, { status: 500 });
  }
}
