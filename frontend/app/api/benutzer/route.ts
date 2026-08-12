import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  administratorAnfordern,
  benutzerAusgeben,
  passwortHashErstellen,
} from "@/lib/auth-server";

const ROLLEN = ["ADMIN", "TEAMLEITER", "SACHBEARBEITER", "MITARBEITER"];

async function naechstePersonalnummer() {
  const vorhandeneNummern = await prisma.benutzer.findMany({
    select: { personalnummer: true },
  });
  const hoechsteNummer = vorhandeneNummern.reduce((maximum, eintrag) => {
    if (!/^\d+$/.test(eintrag.personalnummer)) return maximum;
    return Math.max(maximum, Number(eintrag.personalnummer));
  }, 10000);

  return String(hoechsteNummer + 1).padStart(5, "0");
}

function benutzerListeAusgeben(benutzer: Array<Parameters<typeof benutzerAusgeben>[0]>) {
  return benutzer.map(benutzerAusgeben);
}

export async function GET() {
  const admin = await administratorAnfordern();
  if (!admin) {
    return NextResponse.json({ fehler: "Keine Berechtigung." }, { status: 403 });
  }

  const benutzer = await prisma.benutzer.findMany({
    orderBy: [{ aktiv: "desc" }, { nachname: "asc" }, { vorname: "asc" }],
  });
  return NextResponse.json({ benutzer: benutzerListeAusgeben(benutzer) });
}

export async function POST(request: NextRequest) {
  const admin = await administratorAnfordern();
  if (!admin) {
    return NextResponse.json({ fehler: "Keine Berechtigung." }, { status: 403 });
  }

  try {
    const daten = await request.json();
    const vorname = String(daten.vorname ?? "").trim();
    const nachname = String(daten.nachname ?? "").trim();
    const passwort = String(daten.passwort ?? "");
    const abteilung = String(daten.abteilung ?? "").trim();
    const rolle = String(daten.rolle ?? "MITARBEITER").toUpperCase();

    if (!vorname || !nachname || !abteilung || passwort.length < 4) {
      return NextResponse.json(
        { fehler: "Bitte fülle alle Felder aus. Das Passwort benötigt mindestens 4 Zeichen." },
        { status: 400 },
      );
    }
    if (!ROLLEN.includes(rolle)) {
      return NextResponse.json({ fehler: "Die Rolle ist ungültig." }, { status: 400 });
    }

    const passwortHash = await passwortHashErstellen(passwort);
    let benutzer: Awaited<ReturnType<typeof prisma.benutzer.create>> | null = null;
    let personalnummer = "";

    for (let versuch = 0; versuch < 3 && !benutzer; versuch += 1) {
      personalnummer = await naechstePersonalnummer();
      try {
        benutzer = await prisma.benutzer.create({
          data: {
            vorname,
            nachname,
            personalnummer,
            passwortHash,
            abteilung,
            rollenprofilCode: rolle,
          },
        });
      } catch (error) {
        if ((error as { code?: string }).code !== "P2002" || versuch === 2) {
          throw error;
        }
      }
    }

    if (!benutzer) {
      throw new Error("Personalnummer konnte nicht vergeben werden.");
    }
    await prisma.systemprotokoll.create({
      data: {
        modul: "ADMINISTRATION",
        aktion: "BENUTZER_ANGELEGT",
        details: `${personalnummer} · ${vorname} ${nachname} · ${rolle}`,
        benutzer: `${admin.vorname} ${admin.nachname}`,
      },
    });
    return NextResponse.json({ benutzer: benutzerAusgeben(benutzer) }, { status: 201 });
  } catch (error) {
    console.error("Benutzer anlegen:", error);
    return NextResponse.json(
      { fehler: "Der Benutzer konnte nicht angelegt werden. Ist die Personalnummer bereits vergeben?" },
      { status: 400 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await administratorAnfordern();
  if (!admin) {
    return NextResponse.json({ fehler: "Keine Berechtigung." }, { status: 403 });
  }

  try {
    const daten = await request.json();
    const id = Number(daten.id);
    const vorname = String(daten.vorname ?? "").trim();
    const nachname = String(daten.nachname ?? "").trim();
    const personalnummer = String(daten.personalnummer ?? "").trim();
    const abteilung = String(daten.abteilung ?? "").trim();
    const rolle = String(daten.rolle ?? "").toUpperCase();
    const passwort = String(daten.passwort ?? "");
    const aktiv = Boolean(daten.aktiv);

    if (!Number.isInteger(id) || !vorname || !nachname || !personalnummer || !abteilung) {
      return NextResponse.json({ fehler: "Die Benutzerdaten sind unvollständig." }, { status: 400 });
    }
    if (!ROLLEN.includes(rolle) || (passwort && passwort.length < 4)) {
      return NextResponse.json(
        { fehler: "Rolle oder neues Passwort ist ungültig." },
        { status: 400 },
      );
    }
    if (id === admin.id && (!aktiv || rolle !== "ADMIN")) {
      return NextResponse.json(
        { fehler: "Du kannst deinen eigenen Administratorzugang nicht sperren oder herabstufen." },
        { status: 400 },
      );
    }

    const benutzer = await prisma.benutzer.update({
      where: { id },
      data: {
        vorname,
        nachname,
        personalnummer,
        abteilung,
        rollenprofilCode: rolle,
        aktiv,
        ...(passwort ? { passwortHash: await passwortHashErstellen(passwort) } : {}),
      },
    });
    if (!aktiv) {
      await prisma.benutzerSitzung.deleteMany({ where: { benutzerId: id } });
    }
    await prisma.systemprotokoll.create({
      data: {
        modul: "ADMINISTRATION",
        aktion: "BENUTZER_GEÄNDERT",
        details: `${personalnummer} · ${vorname} ${nachname} · ${rolle} · ${aktiv ? "aktiv" : "gesperrt"}`,
        benutzer: `${admin.vorname} ${admin.nachname}`,
      },
    });
    return NextResponse.json({ benutzer: benutzerAusgeben(benutzer) });
  } catch (error) {
    console.error("Benutzer ändern:", error);
    return NextResponse.json(
      { fehler: "Der Benutzer konnte nicht geändert werden." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await administratorAnfordern();
  if (!admin) {
    return NextResponse.json({ fehler: "Keine Berechtigung." }, { status: 403 });
  }

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id)) {
    return NextResponse.json({ fehler: "Ungültige Benutzer-ID." }, { status: 400 });
  }
  if (id === admin.id) {
    return NextResponse.json({ fehler: "Du kannst deinen eigenen Zugang nicht löschen." }, { status: 400 });
  }

  const ziel = await prisma.benutzer.findUnique({ where: { id } });
  if (!ziel) {
    return NextResponse.json({ fehler: "Benutzer nicht gefunden." }, { status: 404 });
  }
  if (ziel.rollenprofilCode === "ADMIN") {
    const admins = await prisma.benutzer.count({
      where: { rollenprofilCode: "ADMIN", aktiv: true },
    });
    if (admins <= 1) {
      return NextResponse.json(
        { fehler: "Der letzte aktive Administrator kann nicht gelöscht werden." },
        { status: 400 },
      );
    }
  }

  await prisma.benutzer.delete({ where: { id } });
  await prisma.systemprotokoll.create({
    data: {
      modul: "ADMINISTRATION",
      aktion: "BENUTZER_GELÖSCHT",
      details: `${ziel.personalnummer} · ${ziel.vorname} ${ziel.nachname}`,
      benutzer: `${admin.vorname} ${admin.nachname}`,
    },
  });
  return NextResponse.json({ erfolg: true });
}
