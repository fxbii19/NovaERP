import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aktuellerBenutzer } from "@/lib/auth-server";

function nummer(prefix: string) {
  return `${prefix}-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Date.now().toString().slice(-6)}`;
}

function darfFreigeben(rolle: string) {
  return ["ADMIN", "SACHBEARBEITER"].includes(rolle.toUpperCase());
}

export async function GET() {
  try {
    const angemeldet = await aktuellerBenutzer();
    if (!angemeldet) return NextResponse.json({ fehler: "Anmeldung erforderlich." }, { status: 401 });
    const [pruefauftraege, freigaben, sperrbestaende, konfektionsauftraege] =
      await Promise.all([
        prisma.pruefauftrag.findMany({
          include: {
            artikel: true,
            lagerplatz: true,
            pruefung: { include: { freigaben: true } },
          },
          orderBy: { erstelltAm: "desc" },
        }),
        prisma.qualitaetsfreigabe.findMany({
          include: {
            pruefung: {
              include: { pruefauftrag: { include: { artikel: true } } },
            },
          },
          orderBy: { entschiedenAm: "desc" },
        }),
        prisma.sperrbestand.findMany({
          include: { artikel: true, lagerplatz: true, pruefung: true },
          orderBy: { gesperrtAm: "desc" },
        }),
        prisma.konfektionsauftrag.findMany({
          include: { artikel: true, vonLagerplatz: true, nachLagerplatz: true },
          orderBy: { erstelltAm: "desc" },
        }),
      ]);

    return NextResponse.json({
      pruefauftraege,
      freigaben,
      sperrbestaende,
      konfektionsauftraege,
    });
  } catch (error) {
    console.error("Qualitätsdaten konnten nicht geladen werden:", error);
    return NextResponse.json(
      { fehler: "Qualitätsdaten konnten nicht geladen werden." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const angemeldet = await aktuellerBenutzer();
    if (!angemeldet) return NextResponse.json({ fehler: "Anmeldung erforderlich." }, { status: 401 });
    const daten = await request.json();
    const aktion = String(daten.aktion ?? "");
    const rolle = angemeldet.rolle;
    const benutzer = `${angemeldet.vorname} ${angemeldet.nachname}`.trim();

    if (aktion === "pruefauftrag-anlegen") {
      const artikelId = Number(daten.artikelId);
      const pruefmenge = Number(daten.pruefmenge);
      if (!Number.isInteger(artikelId) || !Number.isFinite(pruefmenge) || pruefmenge <= 0) {
        return NextResponse.json({ fehler: "Artikel und Prüfmenge sind erforderlich." }, { status: 400 });
      }
      const auftrag = await prisma.pruefauftrag.create({
        data: {
          pruefnummer: nummer("PA"),
          artikelId,
          lagerplatzId: daten.lagerplatzId ? Number(daten.lagerplatzId) : null,
          typ: String(daten.typ ?? "EINGANGSPRUEFUNG"),
          prioritaet: String(daten.prioritaet ?? "NORMAL"),
          pruefmenge,
          auftraggeber: benutzer,
          zugewiesenAn: String(daten.zugewiesenAn ?? "").trim() || null,
          notiz: String(daten.notiz ?? "").trim() || null,
        },
      });
      return NextResponse.json(auftrag, { status: 201 });
    }

    if (aktion === "pruefung-abschliessen") {
      const pruefauftragId = Number(daten.pruefauftragId);
      const auftrag = await prisma.pruefauftrag.findUnique({ where: { id: pruefauftragId } });
      const gutMenge = Number(daten.gutMenge);
      const fehlerMenge = Number(daten.fehlerMenge);
      if (!auftrag || !Number.isFinite(gutMenge) || !Number.isFinite(fehlerMenge) || gutMenge < 0 || fehlerMenge < 0) {
        return NextResponse.json({ fehler: "Prüfauftrag oder Mengen sind ungültig." }, { status: 400 });
      }
      if (auftrag.pruefnummer.startsWith("DEMO-QS-")) {
        const suffix = auftrag.pruefnummer.replace("DEMO-QS-", "");
        const bestellung = await prisma.bestellung.findUnique({ where: { bestellnummer: `DEMO-EK-${suffix}` } });
        if (bestellung) {
          const bewegungen = await prisma.lagerbewegung.findMany({
            where: { typ: "EINGANG", notiz: { startsWith: `MDE-BESTELLPOSITION:${bestellung.id}:` } },
            select: { status: true },
          });
          if (bewegungen.length === 0 || bewegungen.some((bewegung) => bewegung.status !== "BESTAETIGT")) {
            return NextResponse.json({ fehler: "Qualitätsprüfung gesperrt: Der Wareneingang muss zuerst vollständig am MDE erfasst und am PC bestätigt werden." }, { status: 409 });
          }
        }
      }
      if (gutMenge + fehlerMenge > auftrag.pruefmenge) {
        return NextResponse.json({ fehler: "Gut- und Fehlermenge überschreiten die Prüfmenge." }, { status: 400 });
      }
      const ergebnis = fehlerMenge > 0 ? "ABWEICHUNG" : "BESTANDEN";
      const pruefung = await prisma.$transaction(async (tx) => {
        const neu = await tx.qualitaetspruefung.create({
          data: {
            pruefauftragId,
            ergebnis,
            gutMenge,
            fehlerMenge,
            fehlerart: String(daten.fehlerart ?? "").trim() || null,
            schweregrad: fehlerMenge > 0 ? String(daten.schweregrad ?? "MITTEL") : null,
            bemerkung: String(daten.bemerkung ?? "").trim() || null,
            geprueftVon: benutzer,
          },
        });
        await tx.pruefauftrag.update({
          where: { id: pruefauftragId },
          data: { status: fehlerMenge > 0 ? "FREIGABE_OFFEN" : "ABGESCHLOSSEN", abgeschlossenAm: new Date() },
        });
        if (fehlerMenge > 0) {
          await tx.sperrbestand.create({
            data: {
              artikelId: auftrag.artikelId,
              lagerplatzId: auftrag.lagerplatzId,
              pruefungId: neu.id,
              menge: fehlerMenge,
              grund: String(daten.fehlerart ?? "Qualitätsabweichung"),
              gesperrtVon: benutzer,
            },
          });
        }
        return neu;
      });
      return NextResponse.json(pruefung, { status: 201 });
    }

    if (aktion === "freigabe-entscheiden") {
      if (!darfFreigeben(rolle)) {
        return NextResponse.json({ fehler: "Nur Administratoren und Sachbearbeiter dürfen Freigaben entscheiden." }, { status: 403 });
      }
      const pruefungId = Number(daten.pruefungId);
      const entscheidung = String(daten.entscheidung ?? "");
      if (!["FREIGEGEBEN", "GESPERRT", "NACHARBEIT"].includes(entscheidung)) {
        return NextResponse.json({ fehler: "Die Freigabeentscheidung ist ungültig." }, { status: 400 });
      }
      const pruefung = await prisma.qualitaetspruefung.findUnique({ where: { id: pruefungId } });
      if (!pruefung) return NextResponse.json({ fehler: "Prüfung wurde nicht gefunden." }, { status: 404 });

      await prisma.$transaction(async (tx) => {
        await tx.qualitaetsfreigabe.create({
          data: {
            pruefungId,
            entscheidung,
            begruendung: String(daten.begruendung ?? "").trim() || null,
            entschiedenVon: benutzer,
          },
        });
        await tx.pruefauftrag.update({
          where: { id: pruefung.pruefauftragId },
          data: { status: entscheidung },
        });
        if (entscheidung === "FREIGEGEBEN") {
          await tx.sperrbestand.updateMany({
            where: { pruefungId, status: "GESPERRT" },
            data: { status: "FREIGEGEBEN", freigegebenVon: benutzer, freigegebenAm: new Date() },
          });
        }
      });
      return NextResponse.json({ erfolgreich: true });
    }

    if (aktion === "sperrbestand-freigeben") {
      if (!darfFreigeben(rolle)) {
        return NextResponse.json({ fehler: "Du hast keine Berechtigung zur Freigabe." }, { status: 403 });
      }
      await prisma.sperrbestand.update({
        where: { id: Number(daten.id) },
        data: { status: "FREIGEGEBEN", freigegebenVon: benutzer, freigegebenAm: new Date() },
      });
      return NextResponse.json({ erfolgreich: true });
    }

    if (aktion === "konfektion-anlegen") {
      const sollMenge = Number(daten.sollMenge);
      if (!Number.isFinite(sollMenge) || sollMenge <= 0) {
        return NextResponse.json({ fehler: "Eine gültige Soll-Menge ist erforderlich." }, { status: 400 });
      }
      const auftrag = await prisma.konfektionsauftrag.create({
        data: {
          auftragsnummer: nummer("KO"),
          artikelId: Number(daten.artikelId),
          vonLagerplatzId: daten.vonLagerplatzId ? Number(daten.vonLagerplatzId) : null,
          nachLagerplatzId: daten.nachLagerplatzId ? Number(daten.nachLagerplatzId) : null,
          arbeitsschritt: String(daten.arbeitsschritt ?? "Konfektion"),
          sollMenge,
          bearbeiter: String(daten.bearbeiter ?? "").trim() || null,
          notiz: String(daten.notiz ?? "").trim() || null,
        },
      });
      return NextResponse.json(auftrag, { status: 201 });
    }

    if (aktion === "konfektion-abschliessen") {
      const istMenge = Number(daten.istMenge);
      const ausschussMenge = Number(daten.ausschussMenge ?? 0);
      if (!Number.isFinite(istMenge) || !Number.isFinite(ausschussMenge)) {
        return NextResponse.json({ fehler: "Ist- oder Ausschussmenge ist ungültig." }, { status: 400 });
      }
      const auftrag = await prisma.konfektionsauftrag.update({
        where: { id: Number(daten.id) },
        data: {
          status: "ABGESCHLOSSEN",
          istMenge,
          ausschussMenge,
          abgeschlossenAm: new Date(),
        },
      });
      return NextResponse.json(auftrag);
    }

    return NextResponse.json({ fehler: "Unbekannte Qualitätsaktion." }, { status: 400 });
  } catch (error) {
    console.error("Qualitätsaktion fehlgeschlagen:", error);
    return NextResponse.json(
      { fehler: error instanceof Error ? error.message : "Qualitätsaktion fehlgeschlagen." },
      { status: 500 },
    );
  }
}
