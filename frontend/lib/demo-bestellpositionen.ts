export type DemoBestellposition = {
  position: number;
  artikelnummer: string;
  bezeichnung: string;
  menge: number;
};

const bezeichnungen = [
  "Arbeitsjacke Nova Pro",
  "Schutzhandschuh Flex",
  "Sicherheitsschuh Motion",
  "Verpackungseinheit Standard",
];

export function demoBestellpositionen(
  bestellungId: number,
  anzahl: number,
): DemoBestellposition[] {
  return Array.from({ length: Math.max(1, anzahl) }, (_, index) => ({
    position: index + 1,
    artikelnummer: `DEMO-EK-${String(bestellungId).padStart(3, "0")}-${String(index + 1).padStart(2, "0")}`,
    bezeichnung: bezeichnungen[index % bezeichnungen.length],
    menge: 12 + ((bestellungId + index) * 7) % 89,
  }));
}
