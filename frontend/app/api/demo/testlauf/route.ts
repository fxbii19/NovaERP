import { NextResponse } from "next/server";

import { aktuellerBenutzer } from "@/lib/auth-server";
import { demoBestellpositionen } from "@/lib/demo-bestellpositionen";
import { prisma } from "@/lib/prisma";

function demoSchritte(bestellnummer: string, lieferscheinnummer: string) {
  return [
    { nummer: 1, titel: "Bestellung im Einkauf prüfen", text: bestellnummer, href: "/bestellungen", status: "BEREIT" },
    { nummer: 2, titel: "Ware mit dem MDE erfassen", text: "Bestellposition öffnen und Ist-Menge scannen", href: "/lager/mde", status: "OFFEN" },
    { nummer: 3, titel: "Produktzugang am PC bestätigen", text: `Lieferschein ${lieferscheinnummer} eintragen`, href: "/lager/produktzugang", status: "OFFEN" },
    { nummer: 4, titel: "Bestand und Lagerplatz kontrollieren", text: "Gebuchten Zugang in der Bestandsmaske prüfen", href: "/bestand", status: "OFFEN" },
    { nummer: 5, titel: "Qualitätsprüfung durchführen", text: "Demo-Prüfauftrag bearbeiten und freigeben", href: "/qualitaet/pruefauftraege", status: "OFFEN" },
    { nummer: 6, titel: "Auftrag kommissionieren", text: "Demo-Auftrag starten und abschließen", href: "/logistik/kommissionierung", status: "OFFEN" },
    { nummer: 7, titel: "Versand und Lieferschein abschließen", text: "Sendung vorbereiten, Lieferschein prüfen und versenden", href: "/logistik/versand", status: "OFFEN" },
    { nummer: 8, titel: "Zahlung und Dashboard prüfen", text: "Zahlung bestätigen und Tageswerte kontrollieren", href: "/buchhaltung/zahlungen", status: "OFFEN" },
  ];
}

async function demoArtikelSicherstellen(bestellungId: number, anzahl: number) {
  const positionen = demoBestellpositionen(bestellungId, anzahl);

  await Promise.all(
    positionen.map((position) =>
      prisma.artikel.upsert({
        where: { artikelnummer: position.artikelnummer },
        update: {
          produktname: position.bezeichnung,
          suchbegriff: position.artikelnummer,
          aktiv: true,
        },
        create: {
          artikelnummer: position.artikelnummer,
          produktname: position.bezeichnung,
          suchbegriff: position.artikelnummer,
          groesse: position.position === 3 ? "42" : null,
          variante: "Demo-Wareneingang",
          bestand: 0,
          verfuegbar: 0,
          bestellt: position.menge,
          mindestbestand: 5,
          verkaufspreis: 49.9 + position.position * 15,
        },
      }),
    ),
  );

  return positionen;
}

function demoBenutzer(benutzer: {
  vorname: string;
  nachname: string;
  personalnummer: string;
}) {
  return (
    benutzer.personalnummer === "10000" &&
    benutzer.vorname.toLocaleLowerCase("de-DE") === "nova" &&
    benutzer.nachname.toLocaleLowerCase("de-DE") === "demo"
  );
}

export async function POST() {
  const benutzer = await aktuellerBenutzer();

  if (!benutzer) {
    return NextResponse.json(
      { fehler: "Bitte erneut anmelden." },
      { status: 401 },
    );
  }

  if (!demoBenutzer(benutzer)) {
    return NextResponse.json(
      { fehler: "Der Demo-Testlauf ist nur mit der NOVA-Demo-Anmeldung verfügbar." },
      { status: 403 },
    );
  }

  try {
    const vorhandeneBestellung = await prisma.bestellung.findFirst({
      where: { bestellnummer: { startsWith: "DEMO-EK-" }, status: "Offen" },
      orderBy: { erstelltAm: "desc" },
    });

    if (vorhandeneBestellung) {
      const positionen = await demoArtikelSicherstellen(
        vorhandeneBestellung.id,
        vorhandeneBestellung.gesamtpositionen,
      );
      const lieferscheinnummer =
        vorhandeneBestellung.lieferscheinnummer ??
        `DEMO-LS-${vorhandeneBestellung.bestellnummer.replace("DEMO-EK-", "")}`;

      if (!vorhandeneBestellung.lieferscheinnummer) {
        await prisma.bestellung.update({
          where: { id: vorhandeneBestellung.id },
          data: { lieferscheinnummer },
        });
      }

      await prisma.lagerbewegung.deleteMany({
        where: {
          erfasstVon: "Demo MDE-Scanner",
          status: "ERFASST",
          notiz: { startsWith: "Demo-Wareneingang" },
        },
      });

      return NextResponse.json({
        erfolg: true,
        bereitsVorbereitet: true,
        bestellnummer: vorhandeneBestellung.bestellnummer,
        lieferscheinnummer,
        positionen,
        schritte: demoSchritte(vorhandeneBestellung.bestellnummer, lieferscheinnummer),
        meldung: "Der Demo-Testlauf ist bereits vorbereitet.",
      });
    }

    const jetzt = new Date();
    const datum = jetzt.toISOString().slice(0, 10).replaceAll("-", "");
    const kurz = Date.now().toString().slice(-6);
    const suffix = `${datum}-${kurz}`;
    const warenwert = 6847.39;
    const zahlungswert = 4312.68;
    const nettowert = Math.round((warenwert / 1.19) * 100) / 100;
    const faelligAm = new Date(jetzt);
    faelligAm.setDate(faelligAm.getDate() + 14);

    const ergebnis = await prisma.$transaction(async (tx) => {
      let artikel = await tx.artikel.findFirst({
        where: { aktiv: true },
        orderBy: [{ verkaufspreis: "desc" }, { id: "asc" }],
      });

      if (!artikel) {
        artikel = await tx.artikel.create({
          data: {
            artikelnummer: "DEMO-000001",
            produktname: "Regenparka Cobalt Active – Moosgrün",
            suchbegriff: "DEMO-PARKA",
            groesse: "M",
            variante: "Moosgrün",
            bestand: 120,
            verfuegbar: 120,
            mindestbestand: 30,
            verkaufspreis: 129.9,
          },
        });
      }

      const lagerplatz = await tx.lagerplatz.upsert({
        where: { code: "WE-EK-01" },
        update: { aktiv: true },
        create: {
          code: "WE-EK-01",
          bezeichnung: "Demo-Wareneingang Einkauf",
          bereich: "Wareneingang",
          typ: "BODEN",
        },
      });

      const kunde = await tx.kunde.upsert({
        where: { kundennummer: "KD-VIDEO" },
        update: { firmenname: "NOVA Video-Testkunde GmbH" },
        create: {
          kundennummer: "KD-VIDEO",
          firmenname: "NOVA Video-Testkunde GmbH",
          ansprechpartner: "Alexander Test",
          email: "video@demo.invalid",
          telefon: "030 555 0100",
          ort: "Berlin",
        },
      });

      await tx.dispositionsvorschlag.create({
        data: {
          artikelId: artikel.id,
          vorgeschlageneMenge: 80,
          begruendung: `Demo-Bedarf ${suffix}: Mindestbestand auffüllen`,
          status: "NEU",
          erstelltVon: "NOVA Demo-Automatik",
        },
      });

      const bestellung = await tx.bestellung.create({
        data: {
          bestellnummer: `DEMO-EK-${suffix}`,
          lieferscheinnummer: `DEMO-LS-${suffix}`,
          lieferant: "NOVA Demo-Lieferant",
          status: "Offen",
          gesamtpositionen: 4,
        },
      });

      /* Der Eingang wird im Demoablauf bewusst erst manuell am MDE erfasst.
      await tx.lagerbewegung.create({
        data: {
          typ: "EINGANG",
          status: "ERFASST",
          artikelId: artikel.id,
          menge: 80,
          nachLagerplatzId: lagerplatz.id,
          notiz: `Demo-Wareneingang ${suffix} – Lieferschein am PC eintragen`,
          erfasstVon: "Demo MDE-Scanner",
        },
      });

      */
      await tx.pruefauftrag.create({
        data: {
          pruefnummer: `DEMO-QS-${suffix}`,
          artikelId: artikel.id,
          lagerplatzId: lagerplatz.id,
          typ: "EINGANGSPRUEFUNG",
          status: "OFFEN",
          prioritaet: "HOCH",
          pruefmenge: 80,
          auftraggeber: "Wareneingang",
          zugewiesenAn: "Qualitätssicherung",
          notiz: `Demo-Prüfung ${suffix}`,
          faelligAm: jetzt,
        },
      });

      const auftrag = await tx.logistikauftrag.create({
        data: {
          auftragsnummer: `DEMO-AU-${suffix}`,
          kunde: "NOVA Video-Testkunde GmbH",
          kundenreferenz: `VIDEO-${suffix}`,
          lieferadresse: "Teststraße 1, 10115 Berlin",
          status: "OFFEN",
          prioritaet: "EXPRESS",
          liefertermin: jetzt,
          notiz: "Demo: kommissionieren, verladen und versenden",
          erstelltVon: "NOVA Demo-Automatik",
          positionen: {
            create: {
              artikelId: artikel.id,
              menge: 24,
              einzelpreis: 129.9,
            },
          },
        },
      });

      const offenerZahlungsauftrag = await tx.logistikauftrag.create({
        data: {
          auftragsnummer: `DEMO-ZA-${suffix}`,
          kunde: "NOVA Demo-Kunde Nord GmbH",
          kundenreferenz: `ZAHLUNG-${suffix}`,
          lieferadresse: "Hafenstraße 22, 20457 Hamburg",
          status: "VERSENDET",
          liefertermin: jetzt,
          notiz: "Demo-Sendung – Zahlung noch bestätigen",
          erstelltVon: "NOVA Demo-Automatik",
          positionen: {
            create: {
              artikelId: artikel.id,
              menge: 12,
              einzelpreis: 174.35,
              kommissionierteMenge: 12,
            },
          },
        },
      });

      await tx.versand.create({
        data: {
          versandnummer: `DEMO-VS-${suffix}`,
          auftragId: offenerZahlungsauftrag.id,
          status: "VERSENDET",
          versandart: "Spedition",
          trackingnummer: `NOVA-${kurz}`,
          warenwert: 2092.2,
          versendetVon: "NOVA Demo-Automatik",
          versendetAm: jetzt,
          lieferschein: {
            create: {
              lieferscheinnummer: `DEMO-LS-${suffix}`,
              bemerkung: "Demo-Lieferschein zur offenen Zahlung",
              erstelltVon: "NOVA Demo-Automatik",
            },
          },
        },
      });

      const historieAuftrag = await tx.logistikauftrag.create({
        data: {
          auftragsnummer: `DEMO-HIST-${suffix}`,
          kunde: "NOVA Demo-Bestandskunde GmbH",
          status: "VERSENDET",
          liefertermin: jetzt,
          notiz: "Abgeschlossener Demo-Tagesvorgang",
          erstelltVon: "NOVA Demo-Automatik",
          positionen: {
            create: {
              artikelId: artikel.id,
              menge: 25,
              einzelpreis: 129.9,
              kommissionierteMenge: 25,
            },
          },
        },
      });

      await tx.versand.create({
        data: {
          versandnummer: `DEMO-HVS-${suffix}`,
          auftragId: historieAuftrag.id,
          status: "VERSENDET",
          versandart: "Spedition",
          trackingnummer: `NOVA-H-${kurz}`,
          warenwert,
          bezahlt: true,
          bezahltVon: "NOVA Demo-Automatik",
          bezahltAm: jetzt,
          versendetVon: "NOVA Demo-Automatik",
          versendetAm: jetzt,
          lieferschein: {
            create: {
              lieferscheinnummer: `DEMO-HLS-${suffix}`,
              bemerkung: "Abgeschlossener Demo-Lieferschein",
              erstelltVon: "NOVA Demo-Automatik",
            },
          },
        },
      });

      await tx.rechnung.create({
        data: {
          rechnungsnummer: `DEMO-RE-${suffix}`,
          kundeId: kunde.id,
          kundeName: "NOVA Video-Testkunde GmbH",
          betreff: "Demo-Tagesauftrag",
          nettowert,
          bruttowert: warenwert,
          status: "TEILBEZAHLT",
          rechnungsdatum: jetzt,
          faelligAm,
          erstelltVon: "NOVA Demo-Automatik",
          zahlungen: {
            create: {
              betrag: zahlungswert,
              zahlungsart: "Überweisung",
              referenz: `DEMO-ZAHLUNG-${suffix}`,
              gebuchtVon: "NOVA Demo-Automatik",
              gebuchtAm: jetzt,
            },
          },
        },
      });

      await tx.systemprotokoll.create({
        data: {
          modul: "NOVA Demo",
          aktion: "Interaktiver Demo-Ablauf vorbereitet",
          details: `Demo ${suffix}: Einkauf, Lager, QS, Logistik, Versand und Zahlung warten auf Bearbeitung.`,
          benutzer: "NOVA Demo-Automatik",
        },
      });

      return {
        bestellungId: bestellung.id,
        bestellnummer: bestellung.bestellnummer,
        auftragsnummer: auftrag.auftragsnummer,
        pruefnummer: `DEMO-QS-${suffix}`,
      };
    });

    const positionen = await demoArtikelSicherstellen(ergebnis.bestellungId, 4);

    return NextResponse.json({
      erfolg: true,
      meldung: "Der vollständige Demo-Testlauf wurde vorbereitet.",
      ...ergebnis,
      positionen,
      lieferscheinnummer: `DEMO-LS-${ergebnis.bestellnummer.replace("DEMO-EK-", "")}`,
      schritte: demoSchritte(ergebnis.bestellnummer, `DEMO-LS-${ergebnis.bestellnummer.replace("DEMO-EK-", "")}`),
    });
  } catch (error) {
    console.error("NOVA Demo-Testlauf:", error);
    return NextResponse.json(
      { fehler: "Der Demo-Testlauf konnte nicht vorbereitet werden." },
      { status: 500 },
    );
  }
}
