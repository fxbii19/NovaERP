import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aktuellerBenutzer } from "@/lib/auth-server";

async function alteDemoRechnungenVariieren() {
  const schluessel = "demo-rechnungen-variiert-v1";
  if (await prisma.systemeinstellung.findUnique({ where: { schluessel } })) return;

  const rechnungen = await prisma.rechnung.findMany({
    where: { rechnungsnummer: { startsWith: "DEMO-RE-" } },
    include: { zahlungen: true },
    orderBy: { erstelltAm: "asc" },
  });

  await prisma.$transaction(async (tx) => {
    for (const [index, rechnung] of rechnungen.entries()) {
      const suffix = rechnung.rechnungsnummer.replace("DEMO-RE-", "");
      const auftrag = await tx.logistikauftrag.findUnique({
        where: { auftragsnummer: `DEMO-AU-${suffix}` },
        include: { positionen: true },
      });
      const menge = 12 + ((index * 11 + 7) % 37);
      const einzelpreis = Math.round((74.9 + (index % 6) * 17.35) * 100) / 100;
      const netto = Math.round(menge * einzelpreis * 100) / 100;
      const brutto = Math.round(netto * 1.19 * 100) / 100;
      const variante = index % 4;
      const bezahlt = variante === 0 ? 0 : variante === 1 ? brutto * 0.4 : variante === 2 ? brutto * 0.65 : brutto;
      const zahlungsbetrag = Math.round(bezahlt * 100) / 100;
      const status = zahlungsbetrag === 0 ? "OFFEN" : zahlungsbetrag >= brutto ? "BEZAHLT" : "TEILBEZAHLT";

      if (auftrag?.positionen[0]) {
        await tx.logistikposition.update({
          where: { id: auftrag.positionen[0].id },
          data: { menge, einzelpreis, kommissionierteMenge: Math.min(menge, auftrag.positionen[0].kommissionierteMenge) },
        });
      }
      await tx.rechnung.update({
        where: { id: rechnung.id },
        data: { nettowert: netto, bruttowert: brutto, status, bezahltAm: status === "BEZAHLT" ? new Date() : null },
      });
      if (rechnung.zahlungen[0] && zahlungsbetrag > 0) {
        await tx.zahlung.update({ where: { id: rechnung.zahlungen[0].id }, data: { betrag: zahlungsbetrag } });
      } else if (rechnung.zahlungen[0]) {
        await tx.zahlung.deleteMany({ where: { rechnungId: rechnung.id } });
      } else if (zahlungsbetrag > 0) {
        await tx.zahlung.create({ data: { rechnungId: rechnung.id, betrag: zahlungsbetrag, referenz: `DEMO-ZAHLUNG-${suffix}`, gebuchtVon: "NOVA Demo-Automatik" } });
      }
    }
    await tx.systemeinstellung.create({
      data: { schluessel, wert: "true", typ: "BOOLEAN", kategorie: "DEMO", bezeichnung: "Variable Demo-Rechnungen" },
    });
  });
}

export async function GET() {
  try {
    const benutzer = await aktuellerBenutzer();
    if (!benutzer) return NextResponse.json({ fehler: "Bitte erneut anmelden." }, { status: 401 });
    await alteDemoRechnungenVariieren();
    const [rechnungen, kunden, auftraege] = await Promise.all([
      prisma.rechnung.findMany({ include: { zahlungen: true, kunde: true }, orderBy: { rechnungsdatum: "desc" }, take: 500 }),
      prisma.kunde.findMany({ where: { aktiv: true }, orderBy: { firmenname: "asc" } }),
      prisma.logistikauftrag.findMany({ include: { positionen: { include: { artikel: true } } }, orderBy: { erstelltAm: "desc" }, take: 500 }),
    ]);
    const auftragNachNummer = new Map(auftraege.map((auftrag) => [auftrag.auftragsnummer, auftrag]));
    return NextResponse.json({
      rechnungen: rechnungen.map((rechnung) => {
        const suffix = rechnung.rechnungsnummer.startsWith("DEMO-RE-") ? rechnung.rechnungsnummer.replace("DEMO-RE-", "") : null;
        const nummerImBetreff = auftraege.find((auftrag) => rechnung.betreff.includes(auftrag.auftragsnummer))?.auftragsnummer;
        return { ...rechnung, auftrag: suffix ? auftragNachNummer.get(`DEMO-AU-${suffix}`) ?? null : nummerImBetreff ? auftragNachNummer.get(nummerImBetreff) ?? null : null };
      }),
      kunden,
    });
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
      const bisherBezahlt = rechnung.zahlungen.reduce((s, z) => s + z.betrag, 0);
      const rest = Math.max(0, Math.round((rechnung.bruttowert - bisherBezahlt) * 100) / 100);
      const eingegeben = Math.round(Math.max(0, Number(d.betrag) || 0) * 100) / 100;
      if (!eingegeben) return NextResponse.json({ fehler: "Bitte einen gültigen Betrag eingeben." }, { status: 400 });
      if (eingegeben > rest) return NextResponse.json({ fehler: `Der Zahlungseingang darf den offenen Betrag von ${rest.toFixed(2)} EUR nicht überschreiten.` }, { status: 400 });

      const neuerRest = Math.max(0, Math.round((rest - eingegeben) * 100) / 100);
      const neuerStatus = neuerRest < 0.01 ? "BEZAHLT" : "TEILBEZAHLT";
      const zahlung = await prisma.$transaction(async (tx) => {
        const gebucht = await tx.zahlung.create({ data: { rechnungId: rechnung.id, betrag: eingegeben, zahlungsart: String(d.zahlungsart ?? "Überweisung"), referenz: String(d.referenz ?? "").trim() || null, gebuchtVon: name } });
        await tx.rechnung.update({ where: { id: rechnung.id }, data: { status: neuerStatus, bezahltAm: neuerStatus === "BEZAHLT" ? new Date() : null } });
        return gebucht;
      });
      return NextResponse.json({ zahlung, bisherBezahlt, neuBezahlt: Math.round((bisherBezahlt + eingegeben) * 100) / 100, offenerRest: neuerRest, status: neuerStatus });
    }
    return NextResponse.json({ fehler: "Unbekannte Aktion." }, { status: 400 });
  } catch (error) { console.error("Buchhaltungsaktion fehlgeschlagen:", error); return NextResponse.json({ fehler: "Der Vorgang konnte nicht gespeichert werden." }, { status: 500 }); }
}
