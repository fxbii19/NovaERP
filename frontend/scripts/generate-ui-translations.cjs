const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");

const wurzeln = [path.join(process.cwd(), "app"), path.join(process.cwd(), "components")];
const ziele = { "en-GB": "en", "es-ES": "es", "tr-TR": "tr", "it-IT": "it", "ru-RU": "ru" };
const texte = new Set();

function dateienLesen(ordner) {
  for (const eintrag of fs.readdirSync(ordner, { withFileTypes: true })) {
    const voll = path.join(ordner, eintrag.name);
    if (eintrag.isDirectory()) dateienLesen(voll);
    else if (eintrag.name.endsWith(".tsx")) texteSammeln(fs.readFileSync(voll, "utf8"));
  }
}

function aufnehmen(wert) {
  const text = wert.replace(/\s+/g, " ").trim();
  if (text.length < 2 || text.length > 180) return;
  if (!/[A-Za-zÄÖÜäöüß]/.test(text)) return;
  if (/=>|className|useState|React\.|Promise<|^[=:;)}>{]/.test(text)) return;
  texte.add(text);
}

function texteSammeln(inhalt) {
  for (const treffer of inhalt.matchAll(/>([^<{}`\r\n][^<{}`\r\n]{1,180})</g)) aufnehmen(treffer[1]);
  for (const treffer of inhalt.matchAll(/(?:placeholder|title|aria-label|titel|text|beschreibung|label)="([^"]{2,180})"/g)) aufnehmen(treffer[1]);
  for (const treffer of inhalt.matchAll(/(?:name|titel|text|beschreibung|label)\s*:\s*"([^"]{2,180})"/g)) aufnehmen(treffer[1]);
}

function einstellungstexteSammeln() {
  const inhalt = fs.readFileSync(path.join(process.cwd(), "lib", "einstellungen-i18n.ts"), "utf8");
  const deutsch = inhalt.slice(inhalt.indexOf("const DE:"), inhalt.indexOf("const EN:"));
  for (const treffer of deutsch.matchAll(/:\s*"((?:[^"\\]|\\.)*)"/g)) aufnehmen(JSON.parse(`"${treffer[1]}"`));
}

function anfragen(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let daten = "";
      response.setEncoding("utf8");
      response.on("data", (teil) => (daten += teil));
      response.on("end", () => response.statusCode === 200 ? resolve(daten) : reject(new Error(`HTTP ${response.statusCode}: ${daten}`)));
    }).on("error", reject);
  });
}

async function uebersetzen(text, ziel) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=de&tl=${ziel}&dt=t&q=${encodeURIComponent(text)}`;
  const daten = JSON.parse(await anfragen(url));
  return daten[0].map((teil) => teil[0]).join("");
}

async function spracheErzeugen(quellen, ziel) {
  const ergebnis = {};
  for (let index = 0; index < quellen.length; index += 20) {
    const block = quellen.slice(index, index + 20);
    const uebersetzt = (await uebersetzen(block.join("\n"), ziel)).split("\n");
    if (uebersetzt.length === block.length) {
      block.forEach((quelle, position) => (ergebnis[quelle] = uebersetzt[position].trim()));
    } else {
      for (const quelle of block) ergebnis[quelle] = (await uebersetzen(quelle, ziel)).trim();
    }
    process.stdout.write(`${ziel}: ${Math.min(index + 20, quellen.length)}/${quellen.length}\r`);
  }
  process.stdout.write("\n");
  return ergebnis;
}

async function main() {
  wurzeln.forEach(dateienLesen);
  einstellungstexteSammeln();
  const quellen = [...texte].sort((a, b) => a.localeCompare(b, "de"));
  const katalog = {};
  for (const [region, ziel] of Object.entries(ziele)) katalog[region] = await spracheErzeugen(quellen, ziel);
  fs.writeFileSync(path.join(process.cwd(), "lib", "system-i18n.generated.json"), `${JSON.stringify(katalog, null, 2)}\n`, "utf8");
  console.log(`${quellen.length} Oberflächentexte in ${Object.keys(ziele).length} Sprachen erzeugt.`);
}

main().catch((fehler) => {
  console.error(fehler);
  process.exit(1);
});
