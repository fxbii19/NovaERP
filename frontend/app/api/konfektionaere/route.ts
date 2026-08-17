import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aktuellerBenutzer } from "@/lib/auth-server";

const nummer = (prefix: string) =>
  `${prefix}-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Date.now().toString().slice(-5)}`;

export async function GET() {
  const user = await aktuellerBenutzer();
  if (!user) return NextResponse.json({ fehler: "Anmeldung erforderlich." }, { status: 401 });

  const [konfektionaere, sendungen, artikel] = await Promise.all([
    prisma.konfektionaer.findMany({
      include: { bestaende: { include: { artikel: true }, orderBy: { artikel: { artikelnummer: "asc" } } } },
      orderBy: { name: "asc" },
    }),
    prisma.konfektionaerSendung.findMany({
      include: { konfektionaer: true, artikel: true },
      orderBy: { erstelltAm: "desc" },
    }),
    prisma.artikel.findMany({ where: { aktiv: true }, orderBy: { artikelnummer: "asc" } }),
  ]);

  return NextResponse.json({ konfektionaere, sendungen, artikel });
}

export async function POST(request: NextRequest) {
  try {
    const user = await aktuellerBenutzer();
    if (!user) return NextResponse.json({ fehler: "Anmeldung erforderlich." }, { status: 401 });
    const daten = await request.json();
    const aktion = String(daten.aktion ?? "");
    const benutzer = `${user.vorname} ${user.nachname}`.trim();
    const darfFreigeben = ["ADMIN", "SACHBEARBEITER", "TEAMLEITER"].includes(user.rolle.toUpperCase());

    if (aktion === "konfektionaer-anlegen") {
      if (!String(daten.name ?? "").trim()) {
        return NextResponse.json({ fehler: "Der Name des Konfektionärs fehlt." }, { status: 400 });
      }
      const partner = await prisma.konfektionaer.create({
        data: {
          nummer: nummer("KF"),
          name: String(daten.name).trim(),
          ansprechpartner: String(daten.ansprechpartner ?? "").trim() || null,
          email: String(daten.email ?? "").trim() || null,
          telefon: String(daten.telefon ?? "").trim() || null,
          adresse: String(daten.adresse ?? "").trim() || null,
        },
      });
      return NextResponse.json(partner, { status: 201 });
    }

    if (aktion === "sendung-anlegen") {
      const menge = Number(daten.menge);
      if (!Number.isFinite(menge) || menge <= 0) {
        return NextResponse.json({ fehler: "Eine gültige Materialmenge ist erforderlich." }, { status: 400 });
      }
      const sendung = await prisma.konfektionaerSendung.create({
        data: {
          sendungsnummer: nummer("KFS"),
          konfektionaerId: Number(daten.konfektionaerId),
          artikelId: Number(daten.artikelId),
          menge,
          notiz: String(daten.notiz ?? "").trim() || null,
        },
      });
      return NextResponse.json(sendung, { status: 201 });
    }

    if (aktion === "sendung-freigeben") {
      if (!darfFreigeben) return NextResponse.json({ fehler: "Keine Freigabeberechtigung." }, { status: 403 });
      return NextResponse.json(await prisma.konfektionaerSendung.update({
        where: { id: Number(daten.id) },
        data: { status: "FREIGEGEBEN", freigegebenVon: benutzer, freigegebenAm: new Date() },
      }));
    }

    if (aktion === "sendung-versenden") {
      if (!darfFreigeben) return NextResponse.json({ fehler: "Keine Versandberechtigung." }, { status: 403 });
      const sendung = await prisma.konfektionaerSendung.findUnique({ where: { id: Number(daten.id) } });
      if (!sendung || sendung.status !== "FREIGEGEBEN") {
        return NextResponse.json({ fehler: "Nur freigegebenes Material darf versendet werden." }, { status: 400 });
      }
      await prisma.$transaction([
        prisma.konfektionaerSendung.update({
          where: { id: sendung.id },
          data: { status: "BEIM_KONFEKTIONAER", versandtVon: benutzer, versandtAm: new Date() },
        }),
        prisma.konfektionaerBestand.upsert({
          where: { konfektionaerId_artikelId: { konfektionaerId: sendung.konfektionaerId, artikelId: sendung.artikelId } },
          create: { konfektionaerId: sendung.konfektionaerId, artikelId: sendung.artikelId, menge: sendung.menge },
          update: { menge: { increment: sendung.menge } },
        }),
      ]);
      return NextResponse.json({ erfolgreich: true });
    }

    if (aktion === "sendung-rueckmelden") {
      const fertig = Number(daten.rueckmeldeMenge);
      const ausschuss = Number(daten.ausschussMenge ?? 0);
      const sendung = await prisma.konfektionaerSendung.findUnique({ where: { id: Number(daten.id) } });
      if (!sendung || !Number.isFinite(fertig) || fertig < 0 || !Number.isFinite(ausschuss) || ausschuss < 0 || fertig + ausschuss > sendung.menge) {
        return NextResponse.json({ fehler: "Die Rückmeldung ist für diese Sendung ungültig." }, { status: 400 });
      }
      await prisma.$transaction([
        prisma.konfektionaerSendung.update({
          where: { id: sendung.id },
          data: { status: "ABGESCHLOSSEN", rueckmeldeMenge: fertig, ausschussMenge: ausschuss, abgeschlossenAm: new Date() },
        }),
        prisma.konfektionaerBestand.update({
          where: { konfektionaerId_artikelId: { konfektionaerId: sendung.konfektionaerId, artikelId: sendung.artikelId } },
          data: { menge: { decrement: fertig + ausschuss } },
        }),
      ]);
      return NextResponse.json({ erfolgreich: true });
    }

    return NextResponse.json({ fehler: "Unbekannte Aktion." }, { status: 400 });
  } catch (error) {
    console.error("Konfektionärsaktion fehlgeschlagen:", error);
    return NextResponse.json({ fehler: error instanceof Error ? error.message : "Aktion fehlgeschlagen." }, { status: 500 });
  }
}
