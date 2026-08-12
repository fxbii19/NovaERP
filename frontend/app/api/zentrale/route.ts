import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aktuellerBenutzer } from "@/lib/auth-server";

function name(benutzer: { vorname: string; nachname: string }) {
  return `${benutzer.vorname} ${benutzer.nachname}`.trim();
}

export async function GET() {
  try {
    const benutzer = await aktuellerBenutzer();
    if (!benutzer)
      return NextResponse.json(
        { fehler: "Bitte erneut anmelden." },
        { status: 401 },
      );

    const heute = new Date();
    heute.setHours(0, 0, 0, 0);
    const [telefonate, abwesenheiten, zeitbuchungen, mitarbeiter] =
      await Promise.all([
        prisma.telefonat.findMany({
          orderBy: { angenommenAm: "desc" },
          take: 200,
        }),
        prisma.abwesenheit.findMany({
          where: { bis: { gte: heute } },
          orderBy: { von: "asc" },
          take: 200,
        }),
        prisma.zeitbuchung.findMany({
          where: { zeitpunkt: { gte: heute } },
          orderBy: { zeitpunkt: "desc" },
          take: 300,
        }),
        prisma.benutzer.findMany({
          where: { aktiv: true },
          select: { id: true, vorname: true, nachname: true, abteilung: true },
          orderBy: [{ nachname: "asc" }, { vorname: "asc" }],
        }),
      ]);
    return NextResponse.json({
      telefonate,
      abwesenheiten,
      zeitbuchungen,
      mitarbeiter,
      eigenerBenutzerId: benutzer.id,
    });
  } catch (error) {
    console.error("Zentrale konnte nicht geladen werden:", error);
    return NextResponse.json(
      { fehler: "Die Daten der Zentrale konnten nicht geladen werden." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const benutzer = await aktuellerBenutzer();
    if (!benutzer)
      return NextResponse.json(
        { fehler: "Bitte erneut anmelden." },
        { status: 401 },
      );
    const daten = await request.json();
    const aktion = String(daten.aktion ?? "");
    const bearbeiter = name(benutzer);

    if (aktion === "telefonat-erfassen") {
      const anrufer = String(daten.anrufer ?? "").trim();
      const betreff = String(daten.betreff ?? "").trim();
      if (!anrufer || !betreff)
        return NextResponse.json(
          { fehler: "Anrufer und Betreff werden benötigt." },
          { status: 400 },
        );
      const telefonat = await prisma.telefonat.create({
        data: {
          anrufer,
          betreff,
          firma: String(daten.firma ?? "").trim() || null,
          telefonnummer: String(daten.telefonnummer ?? "").trim() || null,
          notiz: String(daten.notiz ?? "").trim() || null,
          sachbearbeiter: String(daten.sachbearbeiter ?? "").trim() || null,
          angenommenVon: bearbeiter,
        },
      });
      return NextResponse.json(telefonat);
    }

    if (aktion === "telefonat-erledigen") {
      const telefonat = await prisma.telefonat.update({
        where: { id: Number(daten.id) },
        data: { status: "ERLEDIGT", erledigtAm: new Date() },
      });
      return NextResponse.json(telefonat);
    }

    if (aktion === "abwesenheit-erfassen") {
      const benutzerId = Number(daten.benutzerId);
      const mitarbeiter = await prisma.benutzer.findUnique({
        where: { id: benutzerId },
      });
      const von = new Date(String(daten.von ?? ""));
      const bis = new Date(String(daten.bis ?? ""));
      if (
        !mitarbeiter ||
        Number.isNaN(von.getTime()) ||
        Number.isNaN(bis.getTime()) ||
        bis < von
      )
        return NextResponse.json(
          { fehler: "Mitarbeiter und gültiger Zeitraum werden benötigt." },
          { status: 400 },
        );
      const abwesenheit = await prisma.abwesenheit.create({
        data: {
          benutzerId,
          mitarbeiter: `${mitarbeiter.vorname} ${mitarbeiter.nachname}`,
          art: String(daten.art ?? "Urlaub"),
          von,
          bis,
          notiz: String(daten.notiz ?? "").trim() || null,
          erstelltVon: bearbeiter,
        },
      });
      if (
        String(daten.art ?? "Urlaub").toLocaleLowerCase("de-DE") === "urlaub"
      ) {
        const admins = await prisma.benutzer.findMany({
          where: {
            aktiv: true,
            rollenprofilCode: "ADMIN",
            id: { not: benutzer.id },
          },
          select: { id: true },
        });
        if (admins.length > 0) {
          await prisma.interneBenachrichtigung.createMany({
            data: admins.map((admin) => ({
              benutzerId: admin.id,
              titel: "Neuer Urlaubsantrag",
              nachricht: `${mitarbeiter.vorname} ${mitarbeiter.nachname} beantragt Urlaub vom ${von.toLocaleDateString("de-DE")} bis ${bis.toLocaleDateString("de-DE")}.`,
              typ: "URLAUB",
              erstelltVon: bearbeiter,
            })),
          });
        }
      }
      return NextResponse.json(abwesenheit);
    }

    if (aktion === "zeit-buchen") {
      const letzte = await prisma.zeitbuchung.findFirst({
        where: { benutzerId: benutzer.id },
        orderBy: { zeitpunkt: "desc" },
      });
      const typ = letzte?.typ === "KOMMEN" ? "GEHEN" : "KOMMEN";
      const buchung = await prisma.zeitbuchung.create({
        data: {
          benutzerId: benutzer.id,
          mitarbeiter: bearbeiter,
          typ,
          notiz: String(daten.notiz ?? "").trim() || null,
        },
      });
      return NextResponse.json(buchung);
    }

    return NextResponse.json({ fehler: "Unbekannte Aktion." }, { status: 400 });
  } catch (error) {
    console.error("Aktion der Zentrale fehlgeschlagen:", error);
    return NextResponse.json(
      { fehler: "Der Vorgang konnte nicht gespeichert werden." },
      { status: 500 },
    );
  }
}
