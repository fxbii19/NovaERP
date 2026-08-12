import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aktuellerBenutzer } from "@/lib/auth-server";

function nummer(prefix: string) {
  return `${prefix}-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Date.now().toString().slice(-6)}`;
}

export async function GET() {
  try {
    const angemeldet = await aktuellerBenutzer();
    if (!angemeldet) return NextResponse.json({ fehler: "Anmeldung erforderlich." }, { status: 401 });
    const [auftraege, kommissionierungen, ladungen, sendungen, desadv, lieferscheine] = await Promise.all([
      prisma.logistikauftrag.findMany({ include: { positionen: { include: { artikel: true } }, kommissionierung: true, ladungsauftraege: { include: { ladung: true } }, versand: true }, orderBy: { erstelltAm: "desc" } }),
      prisma.kommissionierung.findMany({ include: { auftrag: { include: { positionen: { include: { artikel: true } } } } }, orderBy: { id: "desc" } }),
      prisma.ladung.findMany({ include: { auftraege: { include: { auftrag: true } }, sendungen: true }, orderBy: { erstelltAm: "desc" } }),
      prisma.versand.findMany({ include: { auftrag: { include: { positionen: { include: { artikel: true } } } }, ladung: true, desadv: true, lieferschein: true }, orderBy: { erstelltAm: "desc" } }),
      prisma.desadv.findMany({ include: { versand: { include: { auftrag: true, ladung: true } } }, orderBy: { erstelltAm: "desc" } }),
      prisma.lieferschein.findMany({ include: { versand: { include: { auftrag: { include: { positionen: { include: { artikel: true } } } } } } }, orderBy: { erstelltAm: "desc" } }),
    ]);
    return NextResponse.json({ auftraege, kommissionierungen, ladungen, sendungen, desadv, lieferscheine });
  } catch (error) {
    console.error("Logistikdaten konnten nicht geladen werden:", error);
    return NextResponse.json({ fehler: "Logistikdaten konnten nicht geladen werden." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const angemeldet = await aktuellerBenutzer();
    if (!angemeldet) return NextResponse.json({ fehler: "Anmeldung erforderlich." }, { status: 401 });
    const daten = await request.json();
    const aktion = String(daten.aktion ?? "");
    const benutzer = `${angemeldet.vorname} ${angemeldet.nachname}`.trim();

    if (aktion === "auftrag-anlegen") {
      const menge = Number(daten.menge);
      const artikelId = Number(daten.artikelId);
      if (!String(daten.kunde ?? "").trim() || !Number.isInteger(artikelId) || !Number.isFinite(menge) || menge <= 0) {
        return NextResponse.json({ fehler: "Kunde, Artikel und Menge sind erforderlich." }, { status: 400 });
      }
      const artikel = await prisma.artikel.findUnique({ where: { id: artikelId } });
      if (!artikel) return NextResponse.json({ fehler: "Der Artikel wurde nicht gefunden." }, { status: 404 });
      const auftrag = await prisma.logistikauftrag.create({
        data: {
          auftragsnummer: nummer("AU"),
          kunde: String(daten.kunde).trim(),
          kundenreferenz: String(daten.kundenreferenz ?? "").trim() || null,
          lieferadresse: String(daten.lieferadresse ?? "").trim() || null,
          prioritaet: String(daten.prioritaet ?? "NORMAL"),
          liefertermin: daten.liefertermin ? new Date(daten.liefertermin) : null,
          notiz: String(daten.notiz ?? "").trim() || null,
          erstelltVon: benutzer,
          positionen: { create: { artikelId, menge, einzelpreis: artikel.verkaufspreis } },
        },
        include: { positionen: true },
      });
      return NextResponse.json(auftrag, { status: 201 });
    }

    if (aktion === "position-hinzufuegen") {
      const auftragId = Number(daten.auftragId);
      const artikelId = Number(daten.artikelId);
      const menge = Number(daten.menge);
      const artikel = await prisma.artikel.findUnique({ where: { id: artikelId } });
      if (!artikel) return NextResponse.json({ fehler: "Der Artikel wurde nicht gefunden." }, { status: 404 });
      const position = await prisma.logistikposition.upsert({
        where: { auftragId_artikelId: { auftragId, artikelId } },
        create: { auftragId, artikelId, menge, einzelpreis: artikel.verkaufspreis },
        update: { menge: { increment: menge } },
      });
      return NextResponse.json(position);
    }

    if (aktion === "kommissionierung-starten") {
      const auftragId = Number(daten.auftragId);
      const kommissionierung = await prisma.$transaction(async (tx) => {
        const k = await tx.kommissionierung.upsert({
          where: { auftragId },
          create: { kommissioniernummer: nummer("KO"), auftragId, status: "IN_ARBEIT", bearbeiter: benutzer, gestartetAm: new Date() },
          update: { status: "IN_ARBEIT", bearbeiter: benutzer, gestartetAm: new Date() },
        });
        await tx.logistikauftrag.update({ where: { id: auftragId }, data: { status: "KOMMISSIONIERUNG" } });
        return k;
      });
      return NextResponse.json(kommissionierung);
    }

    if (aktion === "kommissionierung-abschliessen") {
      const auftragId = Number(daten.auftragId);
      const auftrag = await prisma.logistikauftrag.findUnique({ where: { id: auftragId }, include: { positionen: true, kommissionierung: true } });
      if (!auftrag?.kommissionierung) return NextResponse.json({ fehler: "Kommissionierung wurde nicht gestartet." }, { status: 400 });
      await prisma.$transaction([
        ...auftrag.positionen.map((p) => prisma.logistikposition.update({ where: { id: p.id }, data: { kommissionierteMenge: p.menge } })),
        prisma.kommissionierung.update({ where: { id: auftrag.kommissionierung.id }, data: { status: "ABGESCHLOSSEN", abgeschlossenAm: new Date() } }),
        prisma.logistikauftrag.update({ where: { id: auftragId }, data: { status: "KOMMISSIONIERT" } }),
      ]);
      return NextResponse.json({ erfolgreich: true });
    }

    if (aktion === "ladung-anlegen") {
      const ladung = await prisma.ladung.create({
        data: {
          ladungsnummer: nummer("LD"),
          spediteur: String(daten.spediteur ?? "").trim() || null,
          kennzeichen: String(daten.kennzeichen ?? "").trim() || null,
          rampe: String(daten.rampe ?? "").trim() || null,
          ziel: String(daten.ziel ?? "").trim() || null,
          abfahrt: daten.abfahrt ? new Date(daten.abfahrt) : null,
          erstelltVon: benutzer,
        },
      });
      return NextResponse.json(ladung, { status: 201 });
    }

    if (aktion === "ladung-zuordnen") {
      const ladungId = Number(daten.ladungId);
      const auftragId = Number(daten.auftragId);
      await prisma.$transaction([
        prisma.ladungsauftrag.upsert({ where: { ladungId_auftragId: { ladungId, auftragId } }, create: { ladungId, auftragId }, update: {} }),
        prisma.logistikauftrag.update({ where: { id: auftragId }, data: { status: "VERLADUNG" } }),
      ]);
      return NextResponse.json({ erfolgreich: true });
    }

    if (aktion === "versand-vorbereiten") {
      const auftragId = Number(daten.auftragId);
      const auftrag = await prisma.logistikauftrag.findUnique({
        where: { id: auftragId },
        include: { positionen: { include: { artikel: true } } },
      });
      if (!auftrag) return NextResponse.json({ fehler: "Der Auftrag wurde nicht gefunden." }, { status: 404 });
      const warenwert = auftrag.positionen.reduce(
        (summe, position) => summe + position.menge * (position.einzelpreis || position.artikel.verkaufspreis),
        0,
      );
      const versand = await prisma.$transaction(async (tx) => {
        const v = await tx.versand.create({
          data: {
            versandnummer: nummer("VS"),
            auftragId,
            ladungId: daten.ladungId ? Number(daten.ladungId) : null,
            versandart: String(daten.versandart ?? "Spedition"),
            trackingnummer: String(daten.trackingnummer ?? "").trim() || null,
            warenwert: Math.round(warenwert * 100) / 100,
          },
        });
        await tx.lieferschein.create({ data: { lieferscheinnummer: nummer("LS"), versandId: v.id, erstelltVon: benutzer } });
        await tx.desadv.create({ data: { desadvnummer: nummer("DESADV"), versandId: v.id, empfaenger: String(daten.empfaenger ?? "").trim() || null } });
        await tx.logistikauftrag.update({ where: { id: auftragId }, data: { status: "VERSANDBEREIT" } });
        return v;
      });
      return NextResponse.json(versand, { status: 201 });
    }

    if (aktion === "versand-bestaetigen") {
      const versand = await prisma.versand.findUnique({ where: { id: Number(daten.id) } });
      if (!versand) return NextResponse.json({ fehler: "Versand wurde nicht gefunden." }, { status: 404 });
      await prisma.$transaction([
        prisma.versand.update({ where: { id: versand.id }, data: { status: "VERSENDET", versendetVon: benutzer, versendetAm: new Date() } }),
        prisma.logistikauftrag.update({ where: { id: versand.auftragId }, data: { status: "VERSENDET" } }),
        ...(versand.ladungId ? [prisma.ladung.update({ where: { id: versand.ladungId }, data: { status: "ABGEFAHREN" } })] : []),
      ]);
      return NextResponse.json({ erfolgreich: true });
    }

    if (aktion === "zahlung-bestaetigen") {
      const darfZahlungBestaetigen =
        angemeldet.rolle === "ADMIN" || angemeldet.abteilung.toLocaleLowerCase("de-DE") === "versandbüro";
      if (!darfZahlungBestaetigen) {
        return NextResponse.json({ fehler: "Nur Administration und Versandbüro dürfen Zahlungen bestätigen." }, { status: 403 });
      }
      const versand = await prisma.versand.findUnique({ where: { id: Number(daten.id) } });
      if (!versand || versand.status !== "VERSENDET") {
        return NextResponse.json({ fehler: "Nur versendete Aufträge können als bezahlt markiert werden." }, { status: 400 });
      }
      if (versand.bezahlt) return NextResponse.json({ fehler: "Diese Sendung wurde bereits als bezahlt markiert." }, { status: 400 });
      const aktualisiert = await prisma.versand.update({
        where: { id: versand.id },
        data: { bezahlt: true, bezahltAm: new Date(), bezahltVon: benutzer },
      });
      await prisma.systemprotokoll.create({
        data: { modul: "Logistik", aktion: "Zahlung bestätigt", details: `${versand.versandnummer} · ${versand.warenwert.toFixed(2)} EUR`, benutzer },
      });
      return NextResponse.json(aktualisiert);
    }

    if (aktion === "desadv-senden") {
      await prisma.desadv.update({ where: { id: Number(daten.id) }, data: { status: "GESENDET", gesendetVon: benutzer, gesendetAm: new Date() } });
      return NextResponse.json({ erfolgreich: true });
    }

    return NextResponse.json({ fehler: "Unbekannte Logistikaktion." }, { status: 400 });
  } catch (error) {
    console.error("Logistikaktion fehlgeschlagen:", error);
    return NextResponse.json({ fehler: error instanceof Error ? error.message : "Logistikaktion fehlgeschlagen." }, { status: 500 });
  }
}
