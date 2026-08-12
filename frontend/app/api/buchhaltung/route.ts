import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aktuellerBenutzer } from "@/lib/auth-server";

export async function GET() {
  try {
    const benutzer = await aktuellerBenutzer();
    if (!benutzer) return NextResponse.json({ fehler: "Bitte erneut anmelden." }, { status: 401 });
    const [rechnungen, kunden] = await Promise.all([
      prisma.rechnung.findMany({ include: { zahlungen: true, kunde: true }, orderBy: { rechnungsdatum: "desc" }, take: 500 }),
      prisma.kunde.findMany({ where: { aktiv: true }, orderBy: { firmenname: "asc" } }),
    ]);
    return NextResponse.json({ rechnungen, kunden });
  } catch (error) { console.error("Buchhaltung konnte nicht geladen werden:", error); return NextResponse.json({ fehler: "Buchhaltungsdaten konnten nicht geladen werden." }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const benutzer = await aktuellerBenutzer();
    if (!benutzer) return NextResponse.json({ fehler: "Bitte erneut anmelden." }, { status: 401 });
    const d = await request.json(); const aktion = String(d.aktion ?? ""); const name = `${benutzer.vorname} ${benutzer.nachname}`;
    if (aktion === "rechnung-anlegen") {
      const kundeId = Number(d.kundeId); const kunde = await prisma.kunde.findUnique({ where: { id: kundeId } }); const netto = Math.max(0, Number(d.nettowert) || 0); const steuer = Math.max(0, Number(d.steuersatz) || 19);
      if (!kunde || !String(d.betreff ?? "").trim() || netto <= 0) return NextResponse.json({ fehler: "Kunde, Betreff und Nettowert werden benötigt." }, { status: 400 });
      const anzahl = await prisma.rechnung.count(); const datum = new Date(); const faellig = d.faelligAm ? new Date(String(d.faelligAm)) : new Date(datum.getTime() + 14 * 86400000);
      return NextResponse.json(await prisma.rechnung.create({ data: { rechnungsnummer: `RE-${datum.getFullYear()}-${String(anzahl + 1).padStart(5, "0")}`, kundeId, kundeName: kunde.firmenname, betreff: String(d.betreff).trim(), nettowert: netto, steuersatz: steuer, bruttowert: netto * (1 + steuer / 100), faelligAm: faellig, erstelltVon: name } }));
    }
    if (aktion === "zahlung-buchen") {
      const rechnung = await prisma.rechnung.findUnique({ where: { id: Number(d.rechnungId) }, include: { zahlungen: true } }); if (!rechnung) return NextResponse.json({ fehler: "Rechnung nicht gefunden." }, { status: 404 });
      const rest = Math.max(0, rechnung.bruttowert - rechnung.zahlungen.reduce((s, z) => s + z.betrag, 0)); const betrag = Math.min(rest, Math.max(0, Number(d.betrag) || 0)); if (!betrag) return NextResponse.json({ fehler: "Bitte einen gültigen Betrag eingeben." }, { status: 400 });
      const zahlung = await prisma.zahlung.create({ data: { rechnungId: rechnung.id, betrag, zahlungsart: String(d.zahlungsart ?? "Überweisung"), referenz: String(d.referenz ?? "").trim() || null, gebuchtVon: name } });
      const neuerRest = rest - betrag; if (neuerRest < 0.01) await prisma.rechnung.update({ where: { id: rechnung.id }, data: { status: "BEZAHLT", bezahltAm: new Date() } });
      return NextResponse.json(zahlung);
    }
    return NextResponse.json({ fehler: "Unbekannte Aktion." }, { status: 400 });
  } catch (error) { console.error("Buchhaltungsaktion fehlgeschlagen:", error); return NextResponse.json({ fehler: "Der Vorgang konnte nicht gespeichert werden." }, { status: 500 }); }
}
