import { NextRequest, NextResponse } from "next/server";
import { aktuellerBenutzer } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const benutzer = await aktuellerBenutzer();
  if (!benutzer) {
    return NextResponse.json(
      { fehler: "Bitte erneut anmelden." },
      { status: 401 },
    );
  }

  const [mails, meldungen] = await Promise.all([
    prisma.novaMail.findMany({
      where: { benutzerId: benutzer.id, ordner: "POSTEINGANG", gelesen: false },
      orderBy: { erstelltAm: "desc" },
      take: 20,
    }),
    prisma.interneBenachrichtigung.findMany({
      where: { benutzerId: benutzer.id, gelesen: false },
      orderBy: { erstelltAm: "desc" },
      take: 20,
    }),
  ]);

  const eintraege = [
    ...mails.map((mail) => ({
      id: `mail-${mail.id}`,
      art: "MAIL",
      titel: mail.betreff,
      text: `Neue E-Mail von ${mail.absender}`,
      link: "/kommunikation",
      erstelltAm: mail.erstelltAm,
    })),
    ...meldungen.map((meldung) => ({
      id: `meldung-${meldung.id}`,
      art: meldung.typ,
      titel: meldung.titel,
      text: meldung.nachricht,
      link: meldung.typ.startsWith("URLAUB")
        ? "/organisation/urlaub"
        : "/kommunikation/system",
      erstelltAm: meldung.erstelltAm,
    })),
  ].sort((a, b) => b.erstelltAm.getTime() - a.erstelltAm.getTime());

  return NextResponse.json({
    anzahl: eintraege.length,
    eintraege,
    aktualisiertAm: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  const benutzer = await aktuellerBenutzer();
  if (!benutzer) {
    return NextResponse.json(
      { fehler: "Bitte erneut anmelden." },
      { status: 401 },
    );
  }

  const daten = (await request.json()) as { id?: string; alle?: boolean };

  if (daten.alle) {
    await Promise.all([
      prisma.novaMail.updateMany({
        where: {
          benutzerId: benutzer.id,
          ordner: "POSTEINGANG",
          gelesen: false,
        },
        data: { gelesen: true },
      }),
      prisma.interneBenachrichtigung.updateMany({
        where: { benutzerId: benutzer.id, gelesen: false },
        data: { gelesen: true, gelesenAm: new Date() },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  const [art, nummer] = String(daten.id ?? "").split("-");
  const id = Number(nummer);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ fehler: "Ungültige Meldung." }, { status: 400 });
  }

  if (art === "mail") {
    await prisma.novaMail.updateMany({
      where: { id, benutzerId: benutzer.id },
      data: { gelesen: true },
    });
  } else if (art === "meldung") {
    await prisma.interneBenachrichtigung.updateMany({
      where: { id, benutzerId: benutzer.id },
      data: { gelesen: true, gelesenAm: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
