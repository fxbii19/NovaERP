import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type LieferscheinPosition = { position: number; artikelnummer: string; bezeichnung: string; menge: number };
export type LieferscheinDaten = { lieferscheinnummer: string; bestellnummer: string; lieferant: string; datum: Date; positionen: LieferscheinPosition[] };

const breite = 595.28;
const hoehe = 841.89;
const rand = 48;
const gruen = rgb(0.06, 0.72, 0.5);
const dunkel = rgb(0.06, 0.09, 0.16);
const grau = rgb(0.38, 0.43, 0.5);
const hellgrau = rgb(0.93, 0.95, 0.97);

const datumText = (datum: Date) => new Intl.DateTimeFormat("de-DE").format(datum);
const kuerzen = (text: string, laenge: number) => text.length > laenge ? `${text.slice(0, laenge - 3)}...` : text;

export async function lieferscheinPdfErstellen(daten: LieferscheinDaten) {
  const dokument = await PDFDocument.create();
  dokument.setTitle(`Lieferschein ${daten.lieferscheinnummer}`);
  dokument.setAuthor("NOVA ERP");
  dokument.setCreator("NOVA ERP PDF-Generator");
  const normal = await dokument.embedFont(StandardFonts.Helvetica);
  const fett = await dokument.embedFont(StandardFonts.HelveticaBold);
  const seite = dokument.addPage([breite, hoehe]);

  seite.drawText("NOVA DEMO SUPPLY", { x: rand, y: 786, size: 22, font: fett, color: gruen });
  seite.drawText("Industriestrasse 24 - 10115 Berlin", { x: rand, y: 764, size: 9, font: normal, color: grau });
  seite.drawText("Tel. +49 30 555 010 - lieferung@nova-demo.de", { x: rand, y: 750, size: 9, font: normal, color: grau });
  seite.drawText("LIEFERSCHEIN", { x: 397, y: 786, size: 20, font: normal, color: dunkel });
  seite.drawText(daten.lieferscheinnummer, { x: 397, y: 762, size: 10, font: fett, color: dunkel });
  seite.drawLine({ start: { x: rand, y: 730 }, end: { x: breite - rand, y: 730 }, thickness: 2, color: gruen });

  seite.drawText("Empfaenger", { x: rand, y: 700, size: 8, font: fett, color: grau });
  seite.drawText("NOVA ERP Warenannahme", { x: rand, y: 678, size: 12, font: fett, color: dunkel });
  seite.drawText("Logistikzentrum 1", { x: rand, y: 661, size: 10, font: normal, color: dunkel });
  seite.drawText("04109 Leipzig", { x: rand, y: 645, size: 10, font: normal, color: dunkel });

  [["Bestellnummer", daten.bestellnummer], ["Lieferdatum", datumText(daten.datum)], ["Lieferant", daten.lieferant]].forEach(([label, wert], index) => {
    const y = 696 - index * 25;
    seite.drawText(label, { x: 330, y, size: 9, font: normal, color: grau });
    seite.drawText(kuerzen(wert, 28), { x: 420, y, size: 9, font: fett, color: dunkel });
    seite.drawLine({ start: { x: 330, y: y - 7 }, end: { x: 547, y: y - 7 }, thickness: 0.5, color: rgb(0.8, 0.83, 0.87) });
  });

  const kopf = 590;
  seite.drawRectangle({ x: rand, y: kopf, width: breite - rand * 2, height: 30, color: hellgrau });
  [["Pos.", 58], ["Artikelnummer", 100], ["Bezeichnung", 220], ["Menge", 490]].forEach(([text, x]) => seite.drawText(String(text), { x: Number(x), y: kopf + 10, size: 9, font: fett, color: dunkel }));
  daten.positionen.slice(0, 12).forEach((position, index) => {
    const y = kopf - 28 - index * 31;
    seite.drawText(String(position.position), { x: 58, y, size: 9, font: normal, color: dunkel });
    seite.drawText(kuerzen(position.artikelnummer, 20), { x: 100, y, size: 9, font: fett, color: dunkel });
    seite.drawText(kuerzen(position.bezeichnung, 42), { x: 220, y, size: 9, font: normal, color: dunkel });
    seite.drawText(`${position.menge} Stk.`, { x: 490, y, size: 9, font: normal, color: dunkel });
    seite.drawLine({ start: { x: rand, y: y - 10 }, end: { x: breite - rand, y: y - 10 }, thickness: 0.5, color: rgb(0.84, 0.87, 0.9) });
  });

  seite.drawText("Die aufgefuehrten Waren wurden vollstaendig zur Anlieferung bereitgestellt.", { x: rand, y: 170, size: 9, font: normal, color: grau });
  seite.drawText("Dieser Beleg wurde automatisch durch NOVA ERP erzeugt.", { x: rand, y: 154, size: 9, font: normal, color: grau });
  seite.drawLine({ start: { x: rand, y: 100 }, end: { x: 245, y: 100 }, thickness: 0.7, color: grau });
  seite.drawLine({ start: { x: 350, y: 100 }, end: { x: 547, y: 100 }, thickness: 0.7, color: grau });
  seite.drawText("Unterschrift Lieferant", { x: rand, y: 84, size: 8, font: normal, color: grau });
  seite.drawText("Warenannahme / Datum", { x: 350, y: 84, size: 8, font: normal, color: grau });
  seite.drawText(`NOVA ERP - ${daten.lieferscheinnummer} - Seite 1 von 1`, { x: 185, y: 35, size: 8, font: normal, color: grau });
  return dokument.save();
}
