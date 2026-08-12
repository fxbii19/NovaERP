import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aktuellerBenutzer } from "@/lib/auth-server";

type Ereignis = { id: string; zeit: Date; typ: string; titel: string; beschreibung: string; benutzer?: string | null; href?: string };

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const benutzer = await aktuellerBenutzer();
  if (!benutzer) return NextResponse.json({ fehler: "Anmeldung erforderlich." }, { status: 401 });
  const id = Number((await context.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ fehler: "Ungültige Artikel-ID." }, { status: 400 });

  const artikel = await prisma.artikel.findUnique({
    where: { id },
    include: {
      lagerbestaende: { where: { menge: { not: 0 } }, include: { lagerplatz: true } },
      lagerbewegungen: { include: { vonLagerplatz: true, nachLagerplatz: true }, orderBy: { erfasstAm: "desc" } },
      inventurPositionen: { include: { lagerplatz: true }, orderBy: { gezaehltAm: "desc" } },
      pruefauftraege: { include: { lagerplatz: true, pruefung: { include: { freigaben: true } } }, orderBy: { erstelltAm: "desc" } },
      logistikpositionen: { include: { auftrag: { include: { kommissionierung: true, versand: { include: { lieferschein: true } } } } } },
    },
  });
  if (!artikel) return NextResponse.json({ fehler: "Artikel wurde nicht gefunden." }, { status: 404 });

  const ereignisse: Ereignis[] = [{ id: `artikel-${id}`, zeit: artikel.erstelltAm, typ: "ARTIKEL", titel: "Artikel in NOVA angelegt", beschreibung: "Beginn der in NOVA verfügbaren Historie." }];
  for (const b of artikel.lagerbewegungen) {
    ereignisse.push({ id: `lager-${b.id}`, zeit: b.erfasstAm, typ: "LAGER", titel: `${b.typ} · ${b.menge.toLocaleString("de-DE")} Stück`, beschreibung: `${b.vonLagerplatz?.code ?? "Eingang"} → ${b.nachLagerplatz?.code ?? "Ausgang"}${b.lieferscheinnummer ? ` · Lieferschein ${b.lieferscheinnummer}` : ""}`, benutzer: b.erfasstVon, href: "/lager" });
    if (b.bestaetigtAm) ereignisse.push({ id: `lager-b-${b.id}`, zeit: b.bestaetigtAm, typ: "BESTÄTIGUNG", titel: "Lagerbewegung bestätigt", beschreibung: b.lieferscheinnummer ? `Lieferschein ${b.lieferscheinnummer}` : "Bestand wurde gebucht.", benutzer: b.bestaetigtVon, href: "/lager/produktzugang" });
  }
  for (const i of artikel.inventurPositionen) {
    ereignisse.push({ id: `inventur-${i.id}`, zeit: i.gezaehltAm, typ: "INVENTUR", titel: `Inventur am Lagerplatz ${i.lagerplatz.code}`, beschreibung: `Soll ${i.sollMenge.toLocaleString("de-DE")} · Ist ${i.istMenge.toLocaleString("de-DE")} · Differenz ${i.differenz.toLocaleString("de-DE")}`, benutzer: i.gezaehltVon, href: "/lager/inventur" });
  }
  for (const p of artikel.pruefauftraege) {
    ereignisse.push({ id: `qs-${p.id}`, zeit: p.erstelltAm, typ: "QS", titel: `Prüfauftrag ${p.pruefnummer}`, beschreibung: `${p.typ} · Status ${p.status} · Prüfmenge ${p.pruefmenge.toLocaleString("de-DE")}`, benutzer: p.auftraggeber, href: "/qualitaet/pruefauftraege" });
    if (p.pruefung) ereignisse.push({ id: `pruefung-${p.pruefung.id}`, zeit: p.pruefung.geprueftAm, typ: "QS-ERGEBNIS", titel: `Qualitätsprüfung ${p.pruefung.ergebnis}`, beschreibung: `Gut ${p.pruefung.gutMenge.toLocaleString("de-DE")} · Fehler ${p.pruefung.fehlerMenge.toLocaleString("de-DE")}`, benutzer: p.pruefung.geprueftVon, href: "/qualitaet/pruefungen" });
    for (const f of p.pruefung?.freigaben ?? []) ereignisse.push({ id: `freigabe-${f.id}`, zeit: f.entschiedenAm, typ: "FREIGABE", titel: `QS ${f.entscheidung}`, beschreibung: f.begruendung ?? "Freigabeentscheidung dokumentiert.", benutzer: f.entschiedenVon, href: "/qualitaet/freigaben" });
  }
  for (const p of artikel.logistikpositionen) {
    ereignisse.push({ id: `auftrag-${p.id}`, zeit: p.auftrag.erstelltAm, typ: "AUFTRAG", titel: `Auftrag ${p.auftrag.auftragsnummer}`, beschreibung: `${p.auftrag.kunde} · ${p.menge.toLocaleString("de-DE")} Stück · Status ${p.auftrag.status}`, benutzer: p.auftrag.erstelltVon, href: "/logistik/auftraege" });
    if (p.auftrag.kommissionierung?.gestartetAm) ereignisse.push({ id: `komm-start-${p.id}`, zeit: p.auftrag.kommissionierung.gestartetAm, typ: "KOMMISSIONIERUNG", titel: "Kommissionierung gestartet", beschreibung: p.auftrag.kommissionierung.kommissioniernummer, benutzer: p.auftrag.kommissionierung.bearbeiter, href: "/logistik/kommissionierung" });
    if (p.auftrag.kommissionierung?.abgeschlossenAm) ereignisse.push({ id: `komm-ende-${p.id}`, zeit: p.auftrag.kommissionierung.abgeschlossenAm, typ: "KOMMISSIONIERUNG", titel: "Kommissionierung abgeschlossen", beschreibung: `${p.kommissionierteMenge.toLocaleString("de-DE")} Stück kommissioniert.`, benutzer: p.auftrag.kommissionierung.bearbeiter, href: "/logistik/kommissionierung" });
    if (p.auftrag.versand?.versendetAm) ereignisse.push({ id: `versand-${p.id}`, zeit: p.auftrag.versand.versendetAm, typ: "VERSAND", titel: `Versendet · ${p.auftrag.versand.versandnummer}`, beschreibung: p.auftrag.versand.lieferschein ? `Lieferschein ${p.auftrag.versand.lieferschein.lieferscheinnummer}` : "Versand bestätigt.", benutzer: p.auftrag.versand.versendetVon, href: "/logistik/versand" });
  }

  ereignisse.sort((a, b) => b.zeit.getTime() - a.zeit.getTime());
  return NextResponse.json({
    artikel: { id: artikel.id, artikelnummer: artikel.artikelnummer, produktname: artikel.produktname, groesse: artikel.groesse, variante: artikel.variante, bestand: artikel.bestand, reserviert: artikel.reserviert, verfuegbar: artikel.verfuegbar, verkaufspreis: artikel.verkaufspreis, gesperrt: artikel.gesperrt, lagerplaetze: artikel.lagerbestaende.map((b) => ({ code: b.lagerplatz.code, bezeichnung: b.lagerplatz.bezeichnung, menge: b.menge })) },
    ereignisse,
  });
}
