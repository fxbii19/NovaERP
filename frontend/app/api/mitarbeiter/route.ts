import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aktuellerBenutzer } from "@/lib/auth-server";

const erweiterteRollen = new Set(["ADMIN", "TEAMLEITER"]);

function datumOderNull(wert: unknown) {
  if (!wert) return null;
  const datum = new Date(String(wert));
  return Number.isNaN(datum.getTime()) ? null : datum;
}

function text(wert: unknown) {
  return String(wert ?? "").trim();
}

function istErweitert(rolle: string) {
  return erweiterteRollen.has(rolle.toUpperCase());
}

function demoMail(nachname: string) {
  return `${nachname.replaceAll(" ", "")}@nova-test.de`;
}

function nummerErstellen() {
  const tag = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `AA-${tag}-${Date.now().toString().slice(-6)}`;
}

export async function GET() {
  try {
    const angemeldet = await aktuellerBenutzer();
    if (!angemeldet) {
      return NextResponse.json({ fehler: "Bitte zuerst anmelden." }, { status: 401 });
    }

    const erweitert = istErweitert(angemeldet.rolle);
    const eigenerFilter = erweitert ? {} : { benutzerId: angemeldet.id };
    const vollerName = `${angemeldet.vorname} ${angemeldet.nachname}`.trim();

    const [benutzer, aufgaben, schichten, arbeitsauftraege, benachrichtigungen, protokolle] =
      await Promise.all([
        prisma.benutzer.findMany({
          where: { aktiv: true },
          select: {
            id: true,
            personalnummer: true,
            vorname: true,
            nachname: true,
            abteilung: true,
            rollenprofilCode: true,
            aktiv: true,
            letzteAnmeldungAm: true,
          },
          orderBy: [{ nachname: "asc" }, { vorname: "asc" }],
        }),
        prisma.mitarbeiterAufgabe.findMany({
          where: eigenerFilter,
          include: { benutzer: { select: { vorname: true, nachname: true, personalnummer: true } } },
          orderBy: [{ status: "asc" }, { faelligAm: "asc" }, { erstelltAm: "desc" }],
          take: 500,
        }),
        prisma.mitarbeiterschicht.findMany({
          where: eigenerFilter,
          include: { benutzer: { select: { vorname: true, nachname: true, personalnummer: true } } },
          orderBy: [{ datum: "asc" }, { startzeit: "asc" }],
          take: 500,
        }),
        prisma.digitalerArbeitsauftrag.findMany({
          where: eigenerFilter,
          include: { benutzer: { select: { vorname: true, nachname: true, personalnummer: true } } },
          orderBy: [{ status: "asc" }, { faelligAm: "asc" }, { erstelltAm: "desc" }],
          take: 500,
        }),
        prisma.interneBenachrichtigung.findMany({
          where: eigenerFilter,
          include: { benutzer: { select: { vorname: true, nachname: true, personalnummer: true } } },
          orderBy: { erstelltAm: "desc" },
          take: 500,
        }),
        prisma.systemprotokoll.findMany({
          where: erweitert ? {} : { benutzer: vollerName },
          orderBy: { erstelltAm: "desc" },
          take: erweitert ? 200 : 80,
        }),
      ]);

    return NextResponse.json({
      erweitert,
      angemeldet,
      benutzer: benutzer.map((person) => ({
        ...person,
        email: demoMail(person.nachname),
      })),
      aufgaben,
      schichten,
      arbeitsauftraege,
      benachrichtigungen,
      protokolle,
      aktualisiertAm: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Mitarbeitermodul konnte nicht geladen werden:", error);
    return NextResponse.json({ fehler: "Mitarbeiterdaten konnten nicht geladen werden." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const angemeldet = await aktuellerBenutzer();
    if (!angemeldet) return NextResponse.json({ fehler: "Bitte zuerst anmelden." }, { status: 401 });

    const daten = await request.json();
    const aktion = text(daten.aktion);
    const erweitert = istErweitert(angemeldet.rolle);
    const name = `${angemeldet.vorname} ${angemeldet.nachname}`.trim();

    if (["aufgabe-anlegen", "schicht-anlegen", "arbeitsauftrag-anlegen", "nachricht-senden"].includes(aktion) && !erweitert) {
      return NextResponse.json({ fehler: "Dafür ist eine Teamleiter- oder Adminberechtigung erforderlich." }, { status: 403 });
    }

    if (aktion === "aufgabe-anlegen") {
      if (!text(daten.titel) || !Number(daten.benutzerId)) return NextResponse.json({ fehler: "Titel und Mitarbeiter sind erforderlich." }, { status: 400 });
      const eintrag = await prisma.mitarbeiterAufgabe.create({ data: {
        titel: text(daten.titel), beschreibung: text(daten.beschreibung) || null,
        prioritaet: text(daten.prioritaet) || "NORMAL", faelligAm: datumOderNull(daten.faelligAm),
        benutzerId: Number(daten.benutzerId), erstelltVon: name,
      }});
      await prisma.systemprotokoll.create({ data: { modul: "Mitarbeiter", aktion: "Aufgabe angelegt", details: eintrag.titel, benutzer: name } });
      return NextResponse.json(eintrag);
    }

    if (aktion === "schicht-anlegen") {
      const datum = datumOderNull(daten.datum);
      if (!datum || !Number(daten.benutzerId) || !text(daten.startzeit) || !text(daten.endzeit) || !text(daten.bereich)) return NextResponse.json({ fehler: "Mitarbeiter, Datum, Zeiten und Bereich sind erforderlich." }, { status: 400 });
      const eintrag = await prisma.mitarbeiterschicht.create({ data: {
        benutzerId: Number(daten.benutzerId), datum, startzeit: text(daten.startzeit), endzeit: text(daten.endzeit),
        bereich: text(daten.bereich), notiz: text(daten.notiz) || null, erstelltVon: name,
      }});
      await prisma.systemprotokoll.create({ data: { modul: "Mitarbeiter", aktion: "Schicht geplant", details: `${eintrag.bereich}, ${eintrag.startzeit}-${eintrag.endzeit}`, benutzer: name } });
      return NextResponse.json(eintrag);
    }

    if (aktion === "arbeitsauftrag-anlegen") {
      if (!text(daten.titel) || !Number(daten.benutzerId)) return NextResponse.json({ fehler: "Titel und Mitarbeiter sind erforderlich." }, { status: 400 });
      const eintrag = await prisma.digitalerArbeitsauftrag.create({ data: {
        nummer: nummerErstellen(), titel: text(daten.titel), beschreibung: text(daten.beschreibung) || null,
        prioritaet: text(daten.prioritaet) || "NORMAL", faelligAm: datumOderNull(daten.faelligAm),
        benutzerId: Number(daten.benutzerId), erstelltVon: name,
      }});
      await prisma.systemprotokoll.create({ data: { modul: "Mitarbeiter", aktion: "Arbeitsauftrag angelegt", details: `${eintrag.nummer}: ${eintrag.titel}`, benutzer: name } });
      return NextResponse.json(eintrag);
    }

    if (aktion === "nachricht-senden") {
      if (!text(daten.titel) || !text(daten.nachricht) || !Number(daten.benutzerId)) return NextResponse.json({ fehler: "Empfänger, Titel und Nachricht sind erforderlich." }, { status: 400 });
      const eintrag = await prisma.interneBenachrichtigung.create({ data: {
        titel: text(daten.titel), nachricht: text(daten.nachricht), typ: text(daten.typ) || "INFO",
        benutzerId: Number(daten.benutzerId), erstelltVon: name,
      }});
      await prisma.systemprotokoll.create({ data: { modul: "Mitarbeiter", aktion: "Interne Nachricht gesendet", details: eintrag.titel, benutzer: name } });
      return NextResponse.json(eintrag);
    }

    if (aktion === "aufgabe-status") {
      const aktuell = await prisma.mitarbeiterAufgabe.findUnique({ where: { id: Number(daten.id) } });
      if (!aktuell || (!erweitert && aktuell.benutzerId !== angemeldet.id)) return NextResponse.json({ fehler: "Aufgabe nicht gefunden oder nicht freigegeben." }, { status: 403 });
      const eintrag = await prisma.mitarbeiterAufgabe.update({ where: { id: aktuell.id }, data: { status: text(daten.status) || "OFFEN" } });
      await prisma.systemprotokoll.create({ data: { modul: "Mitarbeiter", aktion: "Aufgabenstatus geändert", details: `${eintrag.titel}: ${eintrag.status}`, benutzer: name } });
      return NextResponse.json(eintrag);
    }

    if (aktion === "arbeitsauftrag-status") {
      const aktuell = await prisma.digitalerArbeitsauftrag.findUnique({ where: { id: Number(daten.id) } });
      if (!aktuell || (!erweitert && aktuell.benutzerId !== angemeldet.id)) return NextResponse.json({ fehler: "Arbeitsauftrag nicht gefunden oder nicht freigegeben." }, { status: 403 });
      const status = text(daten.status) || "OFFEN";
      const eintrag = await prisma.digitalerArbeitsauftrag.update({ where: { id: aktuell.id }, data: {
        status, begonnenAm: status === "IN_ARBEIT" && !aktuell.begonnenAm ? new Date() : aktuell.begonnenAm,
        abgeschlossenAm: status === "ABGESCHLOSSEN" ? new Date() : null,
      }});
      await prisma.systemprotokoll.create({ data: { modul: "Mitarbeiter", aktion: "Arbeitsauftrag aktualisiert", details: `${eintrag.nummer}: ${status}`, benutzer: name } });
      return NextResponse.json(eintrag);
    }

    if (aktion === "nachricht-gelesen") {
      const aktuell = await prisma.interneBenachrichtigung.findUnique({ where: { id: Number(daten.id) } });
      if (!aktuell || (!erweitert && aktuell.benutzerId !== angemeldet.id)) return NextResponse.json({ fehler: "Nachricht nicht gefunden." }, { status: 403 });
      return NextResponse.json(await prisma.interneBenachrichtigung.update({ where: { id: aktuell.id }, data: { gelesen: true, gelesenAm: new Date() } }));
    }

    return NextResponse.json({ fehler: "Unbekannte Mitarbeiteraktion." }, { status: 400 });
  } catch (error) {
    console.error("Mitarbeiteraktion fehlgeschlagen:", error);
    return NextResponse.json({ fehler: "Die Aktion konnte nicht ausgeführt werden." }, { status: 500 });
  }
}
