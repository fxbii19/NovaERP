import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aktuellerBenutzer } from "@/lib/auth-server";
import { auditSpeichern } from "@/lib/audit";

const DEMO_LAGERPLAETZE = [
  ["WE-BEK-01", "Wareneingang Bekleidung", "Wareneingang", "MDE-ZONE"],
  ["WE-ROH-01", "Wareneingang Rohmaterial", "Wareneingang", "MDE-ZONE"],
  ["A-01-01", "Regal A · Fach 01", "Bekleidung", "REGAL"],
  ["A-01-02", "Regal A · Fach 02", "Bekleidung", "REGAL"],
  ["A-02-01", "Regal A · Fach 03", "Bekleidung", "REGAL"],
  ["B-01-01", "Regal B · Fach 01", "Bekleidung", "REGAL"],
  ["R-KNOPF-01", "Rohmaterial Knöpfe", "Rohmaterial", "KLEINTEILE"],
  ["R-BAND-01", "Rohmaterial Bänder", "Rohmaterial", "KLEINTEILE"],
  ["R-GUMMI-01", "Rohmaterial Gummiband", "Rohmaterial", "KLEINTEILE"],
  ["R-TRANSP-01", "Rohmaterial Transponder", "Rohmaterial", "KLEINTEILE"],
  ["R-GEWEBE-01", "Rohmaterial Gewebe", "Rohmaterial", "REGAL"],
  ["SPERR-01", "Sperrlager Qualität", "Sperrlager", "GESPERRT"],
  ["WA-01", "Warenausgang Bereitstellung", "Warenausgang", "VERSAND"],
  ["VERSAND-01", "Versandfläche 01", "Versand", "VERSAND"],
] as const;

async function lagerplaetzeSicherstellen() {
  if ((await prisma.lagerplatz.count()) > 0) return;

  await prisma.lagerplatz.createMany({
    data: DEMO_LAGERPLAETZE.map(([code, bezeichnung, bereich, typ]) => ({
      code,
      bezeichnung,
      bereich,
      typ,
    })),
  });
}

async function artikelGesamtbestandAktualisieren(artikelId: number) {
  const summe = await prisma.lagerbestand.aggregate({
    where: { artikelId },
    _sum: { menge: true },
  });
  const bestand = summe._sum.menge ?? 0;
  const artikel = await prisma.artikel.findUnique({ where: { id: artikelId } });

  if (artikel) {
    await prisma.artikel.update({
      where: { id: artikelId },
      data: {
        bestand,
        verfuegbar: bestand - artikel.reserviert,
      },
    });
  }
}

async function umlagerungBestaetigen(id: number, benutzer: string) {
  const bewegung = await prisma.lagerbewegung.findUnique({ where: { id } });
  if (!bewegung || bewegung.typ !== "UMLAGERUNG" || bewegung.status !== "ERFASST") return;
  if (!bewegung.vonLagerplatzId || !bewegung.nachLagerplatzId || bewegung.vonLagerplatzId === bewegung.nachLagerplatzId) {
    throw new Error("Für die Umlagerung werden zwei unterschiedliche Lagerplätze benötigt.");
  }

  await prisma.$transaction(async (tx) => {
    const quelle = await tx.lagerbestand.findUnique({
      where: { artikelId_lagerplatzId: { artikelId: bewegung.artikelId, lagerplatzId: bewegung.vonLagerplatzId! } },
    });
    if (!quelle || quelle.menge < bewegung.menge) {
      throw new Error("Am Ausgangslagerplatz ist nicht genügend Bestand vorhanden.");
    }
    await tx.lagerbestand.update({ where: { id: quelle.id }, data: { menge: { decrement: bewegung.menge } } });
    await tx.lagerbestand.upsert({
      where: { artikelId_lagerplatzId: { artikelId: bewegung.artikelId, lagerplatzId: bewegung.nachLagerplatzId! } },
      create: { artikelId: bewegung.artikelId, lagerplatzId: bewegung.nachLagerplatzId!, menge: bewegung.menge },
      update: { menge: { increment: bewegung.menge } },
    });
    await tx.lagerbewegung.update({
      where: { id: bewegung.id },
      data: { status: "BESTAETIGT", bestaetigtVon: benutzer, bestaetigtAm: new Date() },
    });
  });
  await artikelGesamtbestandAktualisieren(bewegung.artikelId);
}

export async function GET() {
  try {
    const angemeldet = await aktuellerBenutzer();
    if (!angemeldet) return NextResponse.json({ fehler: "Anmeldung erforderlich." }, { status: 401 });
    await lagerplaetzeSicherstellen();

    const offeneUmlagerungen = await prisma.lagerbewegung.findMany({
      where: { typ: "UMLAGERUNG", status: "ERFASST" },
      select: { id: true },
    });
    for (const umlagerung of offeneUmlagerungen) {
      try {
        await umlagerungBestaetigen(umlagerung.id, "NOVA Umlagerungsautomatik");
      } catch (error) {
        console.warn(`Offene Umlagerung ${umlagerung.id} konnte nicht automatisch bestätigt werden:`, error);
      }
    }

    const [lagerplaetze, bewegungen, inventuren, ladungstraeger] =
      await Promise.all([
        prisma.lagerplatz.findMany({
          include: {
            bestaende: {
              where: { menge: { not: 0 } },
              include: { artikel: true },
            },
          },
          orderBy: { code: "asc" },
        }),
        prisma.lagerbewegung.findMany({
          include: { artikel: true, vonLagerplatz: true, nachLagerplatz: true },
          orderBy: { erfasstAm: "desc" },
          take: 200,
        }),
        prisma.inventurPosition.findMany({
          include: { artikel: true, lagerplatz: true },
          orderBy: { gezaehltAm: "desc" },
          take: 200,
        }),
        prisma.ladungstraeger.findMany({
          include: {
            lagerplatz: true,
            positionen: { include: { artikel: true } },
          },
          orderBy: { barcode: "asc" },
        }),
      ]);

    return NextResponse.json({ lagerplaetze, bewegungen, inventuren, ladungstraeger });
  } catch (error) {
    console.error("Lagerdaten konnten nicht geladen werden:", error);
    return NextResponse.json({ fehler: "Lagerdaten konnten nicht geladen werden." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const angemeldet = await aktuellerBenutzer();
    if (!angemeldet) return NextResponse.json({ fehler: "Anmeldung erforderlich." }, { status: 401 });
    await lagerplaetzeSicherstellen();
    const rolle = angemeldet.rolle.toUpperCase();
    const benutzer = `${angemeldet.vorname} ${angemeldet.nachname}`.trim();
    const daten = await request.json();
    const aktion = String(daten.aktion ?? "");

    if (aktion === "lagerplatz-anlegen") {
      const code = String(daten.code ?? "").trim().toUpperCase().replace(/\s+/g, "-");
      const bezeichnung = String(daten.bezeichnung ?? "").trim();
      const bereich = String(daten.bereich ?? "").trim();
      const typ = String(daten.lagerplatzTyp ?? "REGAL").trim().toUpperCase();
      const erlaubteTypen = ["REGAL", "BODEN", "KLEINTEILE", "MDE-ZONE", "VERSAND", "GESPERRT"];

      if (!code || !/^[A-Z0-9ÄÖÜ_-]{2,30}$/.test(code)) {
        return NextResponse.json({ fehler: "Der Lagerplatzcode muss 2 bis 30 Zeichen lang sein und darf Buchstaben, Zahlen, Bindestriche oder Unterstriche enthalten." }, { status: 400 });
      }
      if (!bezeichnung || !bereich) {
        return NextResponse.json({ fehler: "Bezeichnung und Bereich sind erforderlich." }, { status: 400 });
      }
      if (!erlaubteTypen.includes(typ)) {
        return NextResponse.json({ fehler: "Der Lagerplatztyp ist ungültig." }, { status: 400 });
      }
      if (await prisma.lagerplatz.findUnique({ where: { code } })) {
        return NextResponse.json({ fehler: `Der Lagerplatz ${code} ist bereits vorhanden.` }, { status: 409 });
      }

      const lagerplatz = await prisma.lagerplatz.create({
        data: { code, bezeichnung, bereich, typ },
      });
      await auditSpeichern({
        modul: "Lager",
        aktion: "Lagerplatz angelegt",
        benutzer,
        objektTyp: "Lagerplatz",
        objektId: lagerplatz.id,
        alterWert: null,
        neuerWert: lagerplatz,
        grund: "Erweiterung der Lagerstruktur",
      });
      return NextResponse.json(lagerplatz, { status: 201 });
    }

    if (aktion === "mde-erfassen") {
      const artikel = await prisma.artikel.findUnique({
        where: { artikelnummer: String(daten.artikelnummer ?? "").trim() },
      });
      const menge = Number(daten.menge);

      if (!artikel) {
        return NextResponse.json(
          { fehler: `Artikel "${String(daten.artikelnummer ?? "").trim()}" wurde nicht gefunden. Bitte die Position direkt aus der offenen Bestellung übernehmen.` },
          { status: 400 },
        );
      }

      if (!Number.isFinite(menge) || menge <= 0) {
        return NextResponse.json({ fehler: "Die Menge muss größer als 0 sein." }, { status: 400 });
      }

      const bestellungId = Number(daten.bestellungId);
      const bestellposition = Number(daten.bestellposition);
      const istBestellposition = String(daten.typ ?? "EINGANG") === "EINGANG"
        && Number.isInteger(bestellungId) && bestellungId > 0
        && Number.isInteger(bestellposition) && bestellposition > 0;

      if (istBestellposition) {
        const bestellung = await prisma.bestellung.findUnique({ where: { id: bestellungId } });
        const sollPosition = bestellung
          ? (await import("@/lib/demo-bestellpositionen")).demoBestellpositionen(bestellung.id, bestellung.gesamtpositionen)
              .find((position) => position.position === bestellposition)
          : null;
        if (!bestellung || !sollPosition || sollPosition.artikelnummer !== artikel.artikelnummer) {
          return NextResponse.json({ fehler: "Die ausgewählte Bestellposition ist nicht mehr gültig. Bitte neu öffnen." }, { status: 400 });
        }
      }

      const bewegung = await prisma.lagerbewegung.create({
        data: {
          typ: String(daten.typ ?? "EINGANG"),
          artikelId: artikel.id,
          menge,
          vonLagerplatzId: daten.vonLagerplatzId ? Number(daten.vonLagerplatzId) : null,
          nachLagerplatzId: daten.nachLagerplatzId ? Number(daten.nachLagerplatzId) : null,
          ladungstraegerCode: String(daten.ladungstraegerCode ?? "").trim() || null,
          notiz: istBestellposition
            ? `MDE-BESTELLPOSITION:${bestellungId}:${bestellposition} | Mobile MDE-Erfassung`
            : String(daten.notiz ?? "").trim() || null,
          erfasstVon: benutzer,
        },
      });

      if (bewegung.typ === "UMLAGERUNG") {
        try {
          await umlagerungBestaetigen(bewegung.id, benutzer);
        } catch (error) {
          await prisma.lagerbewegung.delete({ where: { id: bewegung.id } });
          throw error;
        }
        const bestaetigteBewegung = await prisma.lagerbewegung.findUnique({ where: { id: bewegung.id } });
        return NextResponse.json(bestaetigteBewegung, { status: 201 });
      }

      return NextResponse.json(bewegung, { status: 201 });
    }

    if (aktion === "bewegung-bestaetigen") {
      const bewegung = await prisma.lagerbewegung.findUnique({
        where: { id: Number(daten.id) },
      });

      if (!bewegung || bewegung.status !== "ERFASST") {
        return NextResponse.json({ fehler: "Die Erfassung ist nicht mehr offen." }, { status: 400 });
      }

      const bestellTreffer = bewegung.notiz?.match(/^MDE-BESTELLPOSITION:(\d+):(\d+)/);
      let bestellLieferschein: string | null = null;
      if (bestellTreffer) {
        const bestellungId = Number(bestellTreffer[1]);
        const bestellung = await prisma.bestellung.findUnique({ where: { id: bestellungId } });
        if (!bestellung) return NextResponse.json({ fehler: "Die zugehörige Bestellung wurde nicht gefunden." }, { status: 404 });
        const { demoBestellpositionen } = await import("@/lib/demo-bestellpositionen");
        const sollPositionen = demoBestellpositionen(bestellung.id, bestellung.gesamtpositionen);
        const alleErfassungen = await prisma.lagerbewegung.findMany({
          where: { typ: "EINGANG", notiz: { startsWith: `MDE-BESTELLPOSITION:${bestellung.id}:` } },
          select: { menge: true, notiz: true },
        });
        const fehlendePositionen = sollPositionen.filter((position) => alleErfassungen
          .filter((eintrag) => eintrag.notiz?.startsWith(`MDE-BESTELLPOSITION:${bestellung.id}:${position.position}`))
          .reduce((summe, eintrag) => summe + eintrag.menge, 0) < position.menge);
        if (fehlendePositionen.length > 0) {
          return NextResponse.json({ fehler: `PC-Bestätigung gesperrt: Zuerst müssen alle Waren am MDE erfasst werden. Es fehlen noch ${fehlendePositionen.length} Position(en).` }, { status: 409 });
        }
        bestellLieferschein = bestellung.lieferscheinnummer;
      }

      const lieferschein = String(daten.lieferscheinnummer ?? "").trim();
      if (bewegung.typ === "EINGANG" && !lieferschein) {
        return NextResponse.json({ fehler: "Die Lieferscheinnummer ist erforderlich." }, { status: 400 });
      }
      if (bestellLieferschein && lieferschein !== bestellLieferschein) {
        return NextResponse.json({ fehler: `Die Lieferscheinnummer stimmt nicht. Erwartet wird ${bestellLieferschein}.` }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        if (bewegung.vonLagerplatzId) {
          const quelle = await tx.lagerbestand.findUnique({
            where: {
              artikelId_lagerplatzId: {
                artikelId: bewegung.artikelId,
                lagerplatzId: bewegung.vonLagerplatzId,
              },
            },
          });
          if (!quelle || quelle.menge < bewegung.menge) {
            throw new Error("Am Ausgangslagerplatz ist nicht genügend Bestand vorhanden.");
          }
          await tx.lagerbestand.update({
            where: { id: quelle.id },
            data: { menge: { decrement: bewegung.menge } },
          });
        }

        if (bewegung.nachLagerplatzId) {
          await tx.lagerbestand.upsert({
            where: {
              artikelId_lagerplatzId: {
                artikelId: bewegung.artikelId,
                lagerplatzId: bewegung.nachLagerplatzId,
              },
            },
            create: {
              artikelId: bewegung.artikelId,
              lagerplatzId: bewegung.nachLagerplatzId,
              menge: bewegung.menge,
            },
            update: { menge: { increment: bewegung.menge } },
          });
        }

        await tx.lagerbewegung.update({
          where: { id: bewegung.id },
          data: {
            status: "BESTAETIGT",
            lieferscheinnummer: lieferschein || null,
            bestaetigtVon: benutzer,
            bestaetigtAm: new Date(),
          },
        });
      });

      await artikelGesamtbestandAktualisieren(bewegung.artikelId);
      return NextResponse.json({ erfolgreich: true });
    }

    if (aktion === "inventur-erfassen") {
      const lagerplatzId = Number(daten.lagerplatzId);
      const artikelId = Number(daten.artikelId);
      const istMenge = Number(daten.istMenge);
      const bestand = await prisma.lagerbestand.findUnique({
        where: { artikelId_lagerplatzId: { artikelId, lagerplatzId } },
      });
      if (!Number.isFinite(istMenge) || istMenge < 0) {
        return NextResponse.json({ fehler: "Die Ist-Menge ist ungültig." }, { status: 400 });
      }
      const sollMenge = bestand?.menge ?? 0;
      const position = await prisma.inventurPosition.create({
        data: {
          artikelId,
          lagerplatzId,
          sollMenge,
          istMenge,
          differenz: istMenge - sollMenge,
          gezaehltVon: benutzer,
        },
      });
      return NextResponse.json(position, { status: 201 });
    }

    if (aktion === "inventur-buchen") {
      if (rolle !== "ADMIN") {
        return NextResponse.json({ fehler: "Nur Administratoren dürfen Inventurdifferenzen buchen." }, { status: 403 });
      }
      const position = await prisma.inventurPosition.findUnique({ where: { id: Number(daten.id) } });
      if (!position || position.status !== "OFFEN") {
        return NextResponse.json({ fehler: "Die Inventurposition ist nicht mehr offen." }, { status: 400 });
      }
      await prisma.$transaction([
        prisma.lagerbestand.upsert({
          where: { artikelId_lagerplatzId: { artikelId: position.artikelId, lagerplatzId: position.lagerplatzId } },
          create: { artikelId: position.artikelId, lagerplatzId: position.lagerplatzId, menge: position.istMenge },
          update: { menge: position.istMenge },
        }),
        prisma.inventurPosition.update({
          where: { id: position.id },
          data: { status: "GEBUCHT", gebuchtVon: benutzer, gebuchtAm: new Date() },
        }),
      ]);
      await artikelGesamtbestandAktualisieren(position.artikelId);
      return NextResponse.json({ erfolgreich: true });
    }

    if (aktion === "ladungstraeger-speichern") {
      const barcode = String(daten.barcode ?? "").trim();
      if (!barcode) return NextResponse.json({ fehler: "Ein Barcode ist erforderlich." }, { status: 400 });
      const traeger = await prisma.ladungstraeger.upsert({
        where: { barcode },
        create: {
          barcode,
          bezeichnung: String(daten.bezeichnung ?? barcode),
          lagerplatzId: daten.lagerplatzId ? Number(daten.lagerplatzId) : null,
        },
        update: {
          bezeichnung: String(daten.bezeichnung ?? barcode),
          lagerplatzId: daten.lagerplatzId ? Number(daten.lagerplatzId) : null,
        },
      });
      return NextResponse.json(traeger);
    }

    if (aktion === "ladungstraeger-position") {
      const ladungstraegerId = Number(daten.ladungstraegerId);
      const artikelId = Number(daten.artikelId);
      const menge = Number(daten.menge);
      if (!Number.isInteger(ladungstraegerId) || !Number.isInteger(artikelId) || !Number.isFinite(menge) || menge <= 0) {
        return NextResponse.json({ fehler: "Ladungsträger, Artikel oder Menge ist ungültig." }, { status: 400 });
      }
      const position = await prisma.ladungstraegerPosition.upsert({
        where: { ladungstraegerId_artikelId: { ladungstraegerId, artikelId } },
        create: { ladungstraegerId, artikelId, menge },
        update: { menge },
      });
      return NextResponse.json(position);
    }

    return NextResponse.json({ fehler: "Unbekannte Lageraktion." }, { status: 400 });
  } catch (error) {
    console.error("Lageraktion fehlgeschlagen:", error);
    return NextResponse.json(
      { fehler: error instanceof Error ? error.message : "Die Lageraktion ist fehlgeschlagen." },
      { status: 500 },
    );
  }
}
