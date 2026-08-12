import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aktuellerBenutzer } from "@/lib/auth-server";

export async function GET() {
  try {
    const benutzer = await aktuellerBenutzer(); if (!benutzer) return NextResponse.json({ fehler: "Bitte erneut anmelden." }, { status: 401 });
    const [dokumente, artikel] = await Promise.all([prisma.cadDokument.findMany({ orderBy: { aktualisiertAm: "desc" }, take: 500 }), prisma.artikel.findMany({ where: { aktiv: true }, select: { id: true, artikelnummer: true, produktname: true, variante: true, groesse: true }, orderBy: { artikelnummer: "asc" }, take: 5000 })]);
    return NextResponse.json({ dokumente, artikel });
  } catch (error) { console.error("CAD konnte nicht geladen werden:", error); return NextResponse.json({ fehler: "CAD-Daten konnten nicht geladen werden." }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const benutzer = await aktuellerBenutzer(); if (!benutzer) return NextResponse.json({ fehler: "Bitte erneut anmelden." }, { status: 401 });
    const d = await request.json(); const aktion = String(d.aktion ?? ""); const name = `${benutzer.vorname} ${benutzer.nachname}`;
    if (aktion === "dokument-anlegen") {
      const bezeichnung = String(d.bezeichnung ?? "").trim(); if (!bezeichnung) return NextResponse.json({ fehler: "Eine Bezeichnung wird benötigt." }, { status: 400 });
      const artikelId = Number(d.artikelId) || null; const artikel = artikelId ? await prisma.artikel.findUnique({ where: { id: artikelId } }) : null; const anzahl = await prisma.cadDokument.count();
      return NextResponse.json(await prisma.cadDokument.create({ data: { dokumentnummer: `CAD-${new Date().getFullYear()}-${String(anzahl + 1).padStart(5, "0")}`, artikelId, artikelnummer: artikel?.artikelnummer ?? null, bezeichnung, dokumenttyp: String(d.dokumenttyp ?? "ZEICHNUNG"), version: String(d.version ?? "A").trim().toUpperCase(), dateiname: String(d.dateiname ?? "").trim() || null, aenderungsnotiz: String(d.aenderungsnotiz ?? "").trim() || null, bearbeiter: name } }));
    }
    if (aktion === "status-aendern") {
      const status = String(d.status ?? "").toUpperCase(); if (!["ENTWURF", "PRÜFUNG", "FREIGEGEBEN", "GESPERRT"].includes(status)) return NextResponse.json({ fehler: "Ungültiger Status." }, { status: 400 });
      return NextResponse.json(await prisma.cadDokument.update({ where: { id: Number(d.id) }, data: { status, ...(status === "FREIGEGEBEN" ? { freigegebenVon: name, freigegebenAm: new Date() } : {}) } }));
    }
    return NextResponse.json({ fehler: "Unbekannte Aktion." }, { status: 400 });
  } catch (error) { console.error("CAD-Aktion fehlgeschlagen:", error); return NextResponse.json({ fehler: "Der Vorgang konnte nicht gespeichert werden." }, { status: 500 }); }
}
