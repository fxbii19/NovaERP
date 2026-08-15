import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aktuellerBenutzer } from "@/lib/auth-server";
import { auditSpeichern } from "@/lib/audit";
import { demoBestellpositionen } from "@/lib/demo-bestellpositionen";

export async function GET() {
  try {
    const [bestellungen, mdeErfassungen] = await Promise.all([
      prisma.bestellung.findMany({ orderBy: { erstelltAm: "desc" } }),
      prisma.lagerbewegung.findMany({
        where: { typ: "EINGANG", notiz: { startsWith: "MDE-BESTELLPOSITION:" } },
        select: { menge: true, notiz: true, erfasstAm: true },
      }),
    ]);

    const erfassteMengen = new Map<string, { menge: number; zuletztErfasstAm: Date }>();
    for (const erfassung of mdeErfassungen) {
      const treffer = erfassung.notiz?.match(/^MDE-BESTELLPOSITION:(\d+):(\d+)/);
      if (!treffer) continue;
      const schluessel = `${treffer[1]}:${treffer[2]}`;
      const bisher = erfassteMengen.get(schluessel);
      erfassteMengen.set(schluessel, {
        menge: (bisher?.menge ?? 0) + erfassung.menge,
        zuletztErfasstAm: bisher && bisher.zuletztErfasstAm > erfassung.erfasstAm
          ? bisher.zuletztErfasstAm
          : erfassung.erfasstAm,
      });
    }

    return NextResponse.json(
      bestellungen.map((bestellung) => ({
        ...bestellung,
        positionen: demoBestellpositionen(
          bestellung.id,
          bestellung.gesamtpositionen,
        ).map((position) => {
          const erfassung = erfassteMengen.get(`${bestellung.id}:${position.position}`);
          const erfasstMenge = erfassung?.menge ?? 0;
          const restMenge = Math.max(0, position.menge - erfasstMenge);
          return {
            ...position,
            erfasstMenge,
            restMenge,
            erfassungsstatus: restMenge === 0
              ? "VOLLSTAENDIG"
              : erfasstMenge > 0 ? "TEILWEISE" : "OFFEN",
            zuletztErfasstAm: erfassung?.zuletztErfasstAm ?? null,
          };
        }),
      })),
    );
  } catch (error) {
    console.error("Bestellungen konnten nicht geladen werden:", error);
    return NextResponse.json({ fehler: "Bestellungen konnten nicht geladen werden." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await aktuellerBenutzer();
    if (!user) return NextResponse.json({ fehler: "Bitte zuerst anmelden." }, { status: 401 });
    const daten = await request.json();
    const id = Number(daten.id);
    const status = String(daten.status ?? "");

    if (!Number.isInteger(id) || !["Abgeschlossen", "Storniert"].includes(status)) {
      return NextResponse.json(
        { fehler: "Die Bestellaktion ist ungültig." },
        { status: 400 }
      );
    }

    const vorher = await prisma.bestellung.findUnique({ where: { id } });
    const bestellung = await prisma.bestellung.update({
      where: { id },
      data: { status },
    });

    await auditSpeichern({ modul: "Bestellungen", aktion: "Bestellstatus geändert", benutzer: `${user.vorname} ${user.nachname}`, objektTyp: "Bestellung", objektId: id, alterWert: { status: vorher?.status }, neuerWert: { status }, grund: String(daten.grund ?? (status === "Abgeschlossen" ? "Wareneingang abgeschlossen" : "Bestellung storniert")) });
    return NextResponse.json(bestellung);
  } catch (error) {
    console.error("BESTELLSTATUS ÄNDERN:", error);
    return NextResponse.json(
      { fehler: "Der Bestellstatus konnte nicht geändert werden." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await aktuellerBenutzer();
    if (!user) return NextResponse.json({ fehler: "Bitte zuerst anmelden." }, { status: 401 });
    const daten = await request.json();

    const lieferant = String(daten.lieferant ?? "").trim();
    const status = String(daten.status ?? "Offen").trim();
    const gesamtpositionen = Number(
      daten.gesamtpositionen ?? 0
    );

    const erlaubteStatus = [
      "Offen",
      "Abgeschlossen",
      "Storniert",
    ];

    if (!lieferant) {
      return NextResponse.json(
        { fehler: "Ein Lieferant ist erforderlich." },
        { status: 400 }
      );
    }

    if (!erlaubteStatus.includes(status)) {
      return NextResponse.json(
        { fehler: "Der Bestellstatus ist ungültig." },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(gesamtpositionen) ||
      gesamtpositionen < 0
    ) {
      return NextResponse.json(
        { fehler: "Die Anzahl der Positionen ist ungültig." },
        { status: 400 }
      );
    }

    const bestellung = await prisma.bestellung.create({
      data: {
        bestellnummer: `TEST-${Date.now()}`,
        lieferscheinnummer: `LS-EK-${Date.now()}`,
        lieferant,
        status,
        gesamtpositionen,
      },
    });

    await auditSpeichern({ modul: "Bestellungen", aktion: "Bestellung angelegt", benutzer: `${user.vorname} ${user.nachname}`, objektTyp: "Bestellung", objektId: bestellung.id, alterWert: null, neuerWert: bestellung, grund: String(daten.grund ?? "Beschaffung") });
    return NextResponse.json(bestellung, {
      status: 201,
    });
  } catch (error) {
    console.error("BESTELLUNG ANLEGEN:", error);

    return NextResponse.json(
      { fehler: "Die Bestellung konnte nicht angelegt werden." },
      { status: 500 }
    );
  }
}
