import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  benutzerAusgeben,
  passwortPruefen,
  sitzungErstellen,
  sitzungSetzen,
} from "@/lib/auth-server";

const versuche = new Map<string, { anzahl: number; gesperrtBis: number }>();

export async function POST(request: NextRequest) {
  try {
    const daten = await request.json();
    const nachname = String(daten.nachname ?? "").trim();
    const passwort = String(daten.passwort ?? "");
    const client = `${request.headers.get("x-forwarded-for") ?? "lokal"}:${nachname.toLowerCase()}`;
    const versuch = versuche.get(client);

    if (versuch && versuch.gesperrtBis > Date.now()) {
      return NextResponse.json(
        { fehler: "Zu viele Anmeldeversuche. Bitte warte kurz." },
        { status: 429 },
      );
    }

    if (!nachname || !passwort) {
      return NextResponse.json(
        { fehler: "Nachname und Passwort werden benötigt." },
        { status: 400 },
      );
    }

    const benutzer = await prisma.benutzer.findFirst({
      where:
        process.env.NOVA_DESKTOP_DEMO === "true"
          ? { nachname }
          : { nachname: { equals: nachname, mode: "insensitive" } },
    });
    const korrekt = benutzer
      ? await passwortPruefen(passwort, benutzer.passwortHash)
      : false;

    if (!benutzer || !korrekt) {
      const anzahl = (versuch?.anzahl ?? 0) + 1;
      versuche.set(client, {
        anzahl,
        gesperrtBis: anzahl >= 5 ? Date.now() + 15 * 60 * 1000 : 0,
      });
      return NextResponse.json(
        { fehler: "Nachname oder Passwort ist falsch." },
        { status: 401 },
      );
    }

    if (!benutzer.aktiv) {
      return NextResponse.json(
        { fehler: "Dieser Benutzer ist gesperrt." },
        { status: 403 },
      );
    }

    versuche.delete(client);
    await prisma.benutzerSitzung.deleteMany({
      where: { laeuftAbAm: { lt: new Date() } },
    });
    const sitzung = await sitzungErstellen(benutzer.id);
    await sitzungSetzen(sitzung.token, sitzung.laeuftAbAm);
    await prisma.benutzer.update({
      where: { id: benutzer.id },
      data: { letzteAnmeldungAm: new Date() },
    });

    return NextResponse.json({ benutzer: benutzerAusgeben(benutzer) });
  } catch (error) {
    console.error("NOVA Anmeldung:", error);
    return NextResponse.json(
      { fehler: "Die Anmeldung konnte nicht verarbeitet werden." },
      { status: 500 },
    );
  }
}
