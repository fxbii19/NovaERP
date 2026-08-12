import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aktuellerBenutzer } from "@/lib/auth-server";

const planungsRollen = new Set(["ADMIN", "TEAMLEITER"]);
const text = (wert: unknown) => String(wert ?? "").trim();
const name = (b: { vorname: string; nachname: string }) =>
  `${b.vorname} ${b.nachname}`.trim();
function datum(wert: unknown) {
  const d = new Date(String(wert ?? ""));
  return Number.isNaN(d.getTime()) ? null : d;
}
function ids(wert: unknown): number[] {
  return Array.isArray(wert) ? wert.map(Number).filter(Number.isInteger) : [];
}

async function ressourcenSicherstellen() {
  if (await prisma.organisationRessource.count()) return;
  await prisma.organisationRessource.createMany({
    data: [
      {
        name: "Besprechungsraum Nord",
        kategorie: "RAUM",
        standort: "Verwaltung · 1. OG",
        beschreibung: "8 Plätze, Bildschirm und Videokonferenz",
      },
      {
        name: "Konferenzraum NOVA",
        kategorie: "RAUM",
        standort: "Verwaltung · EG",
        beschreibung: "18 Plätze, Präsentationstechnik",
      },
      {
        name: "Poolfahrzeug 1",
        kategorie: "FAHRZEUG",
        standort: "Fuhrpark",
        beschreibung: "Dienstfahrzeug",
      },
      {
        name: "Mobiler Beamer",
        kategorie: "GERAET",
        standort: "Zentrale",
        beschreibung: "Mobiles Präsentationsgerät",
      },
    ],
  });
}

export async function GET() {
  try {
    const user = await aktuellerBenutzer();
    if (!user)
      return NextResponse.json(
        { fehler: "Bitte zuerst anmelden." },
        { status: 401 },
      );
    await ressourcenSicherstellen();
    const [
      termineAlle,
      abwesenheitenAlle,
      ressourcen,
      reservierungen,
      benutzer,
    ] = await Promise.all([
      prisma.organisationTermin.findMany({
        orderBy: { startAm: "asc" },
        take: 1000,
      }),
      prisma.abwesenheit.findMany({ orderBy: { von: "asc" }, take: 500 }),
      prisma.organisationRessource.findMany({
        where: { aktiv: true },
        orderBy: [{ kategorie: "asc" }, { name: "asc" }],
      }),
      prisma.ressourcenReservierung.findMany({
        include: { ressource: true },
        orderBy: { startAm: "asc" },
        take: 500,
      }),
      prisma.benutzer.findMany({
        where: { aktiv: true },
        select: {
          id: true,
          vorname: true,
          nachname: true,
          personalnummer: true,
          abteilung: true,
        },
        orderBy: [{ nachname: "asc" }, { vorname: "asc" }],
      }),
    ]);
    const erweitert = planungsRollen.has(user.rolle.toUpperCase());
    const termine = termineAlle.filter(
      (t) =>
        t.sichtbarkeit === "UNTERNEHMEN" ||
        t.organisatorId === user.id ||
        (JSON.parse(t.teilnehmerJson || "[]") as number[]).includes(user.id),
    );
    const abwesenheiten = erweitert
      ? abwesenheitenAlle
      : abwesenheitenAlle.filter((a) => a.benutzerId === user.id);
    const eigeneTermine = termine.filter(
      (t) =>
        t.organisatorId === user.id ||
        (JSON.parse(t.teilnehmerJson || "[]") as number[]).includes(user.id),
    );
    return NextResponse.json({
      user,
      erweitert,
      termine,
      eigeneTermine,
      abwesenheiten,
      ressourcen,
      reservierungen,
      benutzer,
      aktualisiertAm: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Organisation konnte nicht geladen werden:", error);
    return NextResponse.json(
      { fehler: "Organisationsdaten konnten nicht geladen werden." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await aktuellerBenutzer();
    if (!user)
      return NextResponse.json(
        { fehler: "Bitte zuerst anmelden." },
        { status: 401 },
      );
    const daten = await request.json();
    const aktion = text(daten.aktion);
    const bearbeiter = name(user);
    const erweitert = planungsRollen.has(user.rolle.toUpperCase());

    if (aktion === "termin-anlegen") {
      const startAm = datum(daten.startAm);
      const endeAm = datum(daten.endeAm);
      if (!text(daten.titel) || !startAm || !endeAm || endeAm <= startAm)
        return NextResponse.json(
          { fehler: "Titel und ein gültiger Zeitraum sind erforderlich." },
          { status: 400 },
        );
      const sichtbarkeit =
        text(daten.sichtbarkeit) === "UNTERNEHMEN" && erweitert
          ? "UNTERNEHMEN"
          : "PERSOENLICH";
      const termin = await prisma.organisationTermin.create({
        data: {
          titel: text(daten.titel),
          beschreibung: text(daten.beschreibung) || null,
          typ: text(daten.typ) || "TERMIN",
          sichtbarkeit,
          startAm,
          endeAm,
          ort: text(daten.ort) || null,
          organisiertVon: bearbeiter,
          organisatorId: user.id,
          teilnehmerJson: JSON.stringify(ids(daten.teilnehmerIds)),
        },
      });
      await prisma.systemprotokoll.create({
        data: {
          modul: "Organisation",
          aktion: "Termin angelegt",
          details: termin.titel,
          benutzer: bearbeiter,
        },
      });
      return NextResponse.json(termin);
    }
    if (aktion === "termin-status") {
      const termin = await prisma.organisationTermin.findUnique({
        where: { id: Number(daten.id) },
      });
      if (!termin || (!erweitert && termin.organisatorId !== user.id))
        return NextResponse.json(
          { fehler: "Termin darf nicht geändert werden." },
          { status: 403 },
        );
      return NextResponse.json(
        await prisma.organisationTermin.update({
          where: { id: termin.id },
          data: { status: text(daten.status) || "ABGESAGT" },
        }),
      );
    }
    if (aktion === "urlaub-antragen") {
      const von = datum(daten.von);
      const bis = datum(daten.bis);
      if (!von || !bis || bis < von)
        return NextResponse.json(
          { fehler: "Bitte einen gültigen Urlaubszeitraum wählen." },
          { status: 400 },
        );
      const eintrag = await prisma.abwesenheit.create({
        data: {
          benutzerId: user.id,
          mitarbeiter: bearbeiter,
          art: "Urlaub",
          von,
          bis,
          status: "BEANTRAGT",
          notiz: text(daten.notiz) || null,
          erstelltVon: bearbeiter,
        },
      });
      const admins = await prisma.benutzer.findMany({
        where: { aktiv: true, rollenprofilCode: "ADMIN", id: { not: user.id } },
        select: { id: true },
      });
      if (admins.length > 0) {
        await prisma.interneBenachrichtigung.createMany({
          data: admins.map((admin) => ({
            benutzerId: admin.id,
            titel: "Neuer Urlaubsantrag",
            nachricht: `${bearbeiter} beantragt Urlaub vom ${von.toLocaleDateString("de-DE")} bis ${bis.toLocaleDateString("de-DE")}.`,
            typ: "URLAUB_ANTRAG",
            erstelltVon: bearbeiter,
          })),
        });
      }
      await prisma.systemprotokoll.create({
        data: {
          modul: "Organisation",
          aktion: "Urlaub beantragt",
          details: `${von.toLocaleDateString("de-DE")} bis ${bis.toLocaleDateString("de-DE")}`,
          benutzer: bearbeiter,
        },
      });
      return NextResponse.json(eintrag);
    }
    if (aktion === "urlaub-status") {
      if (!erweitert)
        return NextResponse.json(
          {
            fehler:
              "Nur Teamleitung oder Administration darf Urlaubsanträge freigeben.",
          },
          { status: 403 },
        );
      const status = text(daten.status);
      if (!new Set(["GENEHMIGT", "ABGELEHNT"]).has(status))
        return NextResponse.json(
          { fehler: "Ungültiger Urlaubsstatus." },
          { status: 400 },
        );
      const vorher = await prisma.abwesenheit.findUnique({
        where: { id: Number(daten.id) },
      });
      if (!vorher)
        return NextResponse.json(
          { fehler: "Der Urlaubsantrag wurde nicht gefunden." },
          { status: 404 },
        );
      const widerrufen =
        vorher.status === "GENEHMIGT" && status === "ABGELEHNT";
      const eintrag = await prisma.abwesenheit.update({
        where: { id: Number(daten.id) },
        data: { status },
      });
      if (eintrag.benutzerId) {
        await prisma.interneBenachrichtigung.create({
          data: {
            benutzerId: eintrag.benutzerId,
            titel: widerrufen
              ? "Urlaubsgenehmigung widerrufen"
              : status === "GENEHMIGT"
                ? "Urlaub genehmigt"
                : "Urlaub abgelehnt",
            nachricht: `Dein Urlaubsantrag vom ${eintrag.von.toLocaleDateString("de-DE")} bis ${eintrag.bis.toLocaleDateString("de-DE")} wurde ${widerrufen ? "nachträglich abgelehnt" : status === "GENEHMIGT" ? "genehmigt" : "abgelehnt"}.`,
            typ: "URLAUB_STATUS",
            erstelltVon: bearbeiter,
          },
        });
      }
      await prisma.systemprotokoll.create({
        data: {
          modul: "Organisation",
          aktion: "Urlaubsstatus geändert",
          details: `${eintrag.mitarbeiter}: ${vorher.status} → ${eintrag.status}`,
          benutzer: bearbeiter,
        },
      });
      return NextResponse.json(eintrag);
    }
    if (aktion === "ressource-reservieren") {
      const startAm = datum(daten.startAm);
      const endeAm = datum(daten.endeAm);
      const ressourceId = Number(daten.ressourceId);
      if (
        !ressourceId ||
        !text(daten.titel) ||
        !startAm ||
        !endeAm ||
        endeAm <= startAm
      )
        return NextResponse.json(
          { fehler: "Ressource, Anlass und Zeitraum sind erforderlich." },
          { status: 400 },
        );
      const konflikt = await prisma.ressourcenReservierung.findFirst({
        where: {
          ressourceId,
          status: "RESERVIERT",
          startAm: { lt: endeAm },
          endeAm: { gt: startAm },
        },
      });
      if (konflikt)
        return NextResponse.json(
          {
            fehler: "Die Ressource ist in diesem Zeitraum bereits reserviert.",
          },
          { status: 409 },
        );
      const eintrag = await prisma.ressourcenReservierung.create({
        data: {
          ressourceId,
          titel: text(daten.titel),
          startAm,
          endeAm,
          gebuchtVon: bearbeiter,
          benutzerId: user.id,
          notiz: text(daten.notiz) || null,
        },
      });
      await prisma.systemprotokoll.create({
        data: {
          modul: "Organisation",
          aktion: "Ressource reserviert",
          details: eintrag.titel,
          benutzer: bearbeiter,
        },
      });
      return NextResponse.json(eintrag);
    }
    return NextResponse.json(
      { fehler: "Unbekannte Organisationsaktion." },
      { status: 400 },
    );
  } catch (error) {
    console.error("Organisationsaktion fehlgeschlagen:", error);
    return NextResponse.json(
      { fehler: "Der Vorgang konnte nicht gespeichert werden." },
      { status: 500 },
    );
  }
}
