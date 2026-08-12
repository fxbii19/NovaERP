import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aktuellerBenutzer } from "@/lib/auth-server";
import { cacheLesen } from "@/lib/server-cache";

export async function GET() {
  const benutzer = await aktuellerBenutzer();
  if (!benutzer) return NextResponse.json({ fehler: "Anmeldung erforderlich." }, { status: 401 });

  const heute = new Date();
  heute.setHours(0, 0, 0, 0);

  try {
    const [artikelGesamt, kritischeBestaende, ohneBestand, offeneBestellungen, offeneAuftraege,
      offeneQs, sperrbestaende, offeneMde, offeneInventuren, versandbereit, lagerHeute, pruefungenHeute,
      kommissioniertHeute, versendetHeute] = await cacheLesen("dashboard:kernzahlen", 10_000, () => Promise.all([
      prisma.artikel.count({ where: { aktiv: true } }),
      prisma.artikel.count({ where: { aktiv: true, mindestbestand: { gt: 0 }, verfuegbar: { lte: prisma.artikel.fields.mindestbestand } } }),
      prisma.artikel.count({ where: { aktiv: true, verfuegbar: { lte: 0 } } }),
      process.env.NOVA_DESKTOP_DEMO === "true"
        ? prisma.bestellung.count({ where: { status: "Offen" } })
        : prisma.bestellung.count({ where: { status: { equals: "Offen", mode: "insensitive" } } }),
      prisma.logistikauftrag.count({ where: { status: { notIn: ["VERSENDET", "ABGESCHLOSSEN", "STORNIERT"] } } }),
      prisma.pruefauftrag.count({ where: { status: { in: ["OFFEN", "FREIGABE_OFFEN"] } } }),
      prisma.sperrbestand.count({ where: { status: "GESPERRT" } }),
      prisma.lagerbewegung.count({ where: { status: "ERFASST" } }),
      prisma.inventurPosition.count({ where: { status: "OFFEN", differenz: { not: 0 } } }),
      prisma.versand.count({ where: { status: "BEREIT" } }),
      prisma.lagerbewegung.count({ where: { erfasstAm: { gte: heute } } }),
      prisma.qualitaetspruefung.count({ where: { geprueftAm: { gte: heute } } }),
      prisma.kommissionierung.count({ where: { abgeschlossenAm: { gte: heute } } }),
      prisma.versand.count({ where: { versendetAm: { gte: heute } } }),
    ]));

    const warnungen = [
      kritischeBestaende > 0 && { stufe: "kritisch", titel: "Mindestbestand unterschritten", text: `${kritischeBestaende} Artikel benötigen Aufmerksamkeit.`, href: "/bestand" },
      sperrbestaende > 0 && { stufe: "kritisch", titel: "Gesperrter Bestand", text: `${sperrbestaende} QS-Positionen sind gesperrt.`, href: "/qualitaet/sperrbestand" },
      offeneInventuren > 0 && { stufe: "warnung", titel: "Inventurdifferenzen offen", text: `${offeneInventuren} Differenzen warten auf Prüfung.`, href: "/lager/inventur" },
      offeneMde > 0 && { stufe: "warnung", titel: "MDE-Bestätigung ausstehend", text: `${offeneMde} Erfassungen sind noch nicht bestätigt.`, href: "/lager/produktzugang" },
    ].filter(Boolean);

    const empfehlungen = [];
    if (kritischeBestaende > 0) empfehlungen.push(`Prüfe zuerst die ${kritischeBestaende} Artikel unter Mindestbestand und offene Bestellungen.`);
    if (offeneQs > 0) empfehlungen.push(`Priorisiere ${offeneQs} offene Qualitätsprüfungen, damit gesperrte Ware schneller entschieden wird.`);
    if (versandbereit > 0) empfehlungen.push(`${versandbereit} Sendungen sind versandbereit und können heute abgeschlossen werden.`);
    if (empfehlungen.length === 0) empfehlungen.push("Aktuell bestehen keine kritischen Handlungsempfehlungen. Die Prozesse laufen stabil.");

    const darfUmsatzSehen =
      benutzer.rolle === "ADMIN" || benutzer.abteilung.toLocaleLowerCase("de-DE") === "versandbüro";
    const umsatz = darfUmsatzSehen
      ? await Promise.all([
          prisma.versand.aggregate({ where: { versendetAm: { gte: heute } }, _sum: { warenwert: true } }),
          prisma.zahlung.aggregate({ where: { gebuchtAm: { gte: heute } }, _sum: { betrag: true } }),
          prisma.versand.findMany({ where: { versendetAm: { gte: heute } }, include: { auftrag: true, lieferschein: true }, orderBy: { versendetAm: "desc" } }),
          prisma.zahlung.findMany({ where: { gebuchtAm: { gte: heute } }, include: { rechnung: true }, orderBy: { gebuchtAm: "desc" } }),
        ]).then(([versendet, bezahlt, sendungen, zahlungen]) => ({
          versendetHeute: Math.round((versendet._sum.warenwert ?? 0) * 100) / 100,
          bezahltHeute: Math.round((bezahlt._sum.betrag ?? 0) * 100) / 100,
          sendungen: sendungen.map(s => ({ id:s.id, versandnummer:s.versandnummer, auftragsnummer:s.auftrag.auftragsnummer, kunde:s.auftrag.kunde, warenwert:s.warenwert, versendetAm:s.versendetAm, versendetVon:s.versendetVon, lieferscheinnummer:s.lieferschein?.lieferscheinnummer ?? null })),
          zahlungen: zahlungen.map(z => ({ id:z.id, rechnungsnummer:z.rechnung.rechnungsnummer, kunde:z.rechnung.kundeName, betreff:z.rechnung.betreff, betrag:z.betrag, zahlungsart:z.zahlungsart, referenz:z.referenz, gebuchtAm:z.gebuchtAm, gebuchtVon:z.gebuchtVon })),
        }))
      : null;

    return NextResponse.json({
      aktualisiertAm: new Date().toISOString(),
      systemstatus: warnungen.some((w) => w && "stufe" in w && w.stufe === "kritisch") ? "AUFMERKSAMKEIT" : "STABIL",
      kennzahlen: { artikelGesamt, kritischeBestaende, ohneBestand, offeneBestellungen, offeneAuftraege, offeneQs, sperrbestaende, offeneMde, offeneInventuren, versandbereit },
      heute: { lagerHeute, pruefungenHeute, kommissioniertHeute, versendetHeute },
      umsatz,
      warnungen,
      empfehlungen,
    });
  } catch (error) {
    console.error("NOVA Command Center:", error);
    return NextResponse.json({ fehler: "Das NOVA Command Center konnte nicht geladen werden." }, { status: 500 });
  }
}
