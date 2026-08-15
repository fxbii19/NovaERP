export const MAXIMALE_MENGE_PRO_LADUNGSTRAEGER = 50;

function hash(text: string): number {
  let wert = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    wert ^= text.charCodeAt(index);
    wert = Math.imul(wert, 16777619);
  }

  return wert >>> 0;
}

function zufall(seed: number): () => number {
  let wert = seed;

  return () => {
    wert += 0x6d2b79f5;
    let ergebnis = wert;
    ergebnis = Math.imul(ergebnis ^ (ergebnis >>> 15), ergebnis | 1);
    ergebnis ^= ergebnis + Math.imul(ergebnis ^ (ergebnis >>> 7), ergebnis | 61);
    return ((ergebnis ^ (ergebnis >>> 14)) >>> 0) / 4294967296;
  };
}

export function ladungstraegerMengen(
  artikelnummer: string,
  bestand: number,
): number[] {
  let rest = Math.max(0, Math.floor(bestand));
  if (rest === 0) return [];

  const mengen: number[] = [];
  const naechsterZufall = zufall(hash(artikelnummer));

  while (rest > MAXIMALE_MENGE_PRO_LADUNGSTRAEGER) {
    const menge = 30 + Math.floor(naechsterZufall() * 21);
    mengen.push(Math.min(menge, rest - 1));
    rest -= mengen[mengen.length - 1];
  }

  if (rest > 0) mengen.push(rest);
  return mengen;
}

export function ladungstraegerBarcode(artikelId: number, index: number): string {
  return `NOVA-LT-${String(artikelId).padStart(6, "0")}-${String(index + 1).padStart(4, "0")}`;
}

export function ladungstraegerBarcodeLesen(barcode: string): {
  artikelId: number;
  index: number;
} | null {
  const treffer = barcode.trim().toUpperCase().match(/^NOVA-LT-(\d+)-(\d+)$/);
  if (!treffer) return null;

  const artikelId = Number(treffer[1]);
  const index = Number(treffer[2]) - 1;
  return Number.isInteger(artikelId) && Number.isInteger(index) && index >= 0
    ? { artikelId, index }
    : null;
}

