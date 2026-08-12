import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aktuellerBenutzer } from "@/lib/auth-server";
import { lieferscheinPdfErstellen } from "@/lib/pdf/dokument-generator";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await aktuellerBenutzer())) return NextResponse.json({ fehler: "Bitte zuerst anmelden." }, { status: 401 });
  const { id } = await params;
  const bestellung = await prisma.bestellung.findUnique({ where: { id: Number(id) } });
  if (!bestellung) return NextResponse.json({ fehler: "Bestellung wurde nicht gefunden." }, { status: 404 });
  const positionen = Array.from({ length: Math.max(1, bestellung.gesamtpositionen) }, (_, index) => ({
    position: index + 1,
    artikelnummer: `DEMO-EK-${String(bestellung.id).padStart(3, "0")}-${String(index + 1).padStart(2, "0")}`,
    bezeichnung: ["Arbeitsjacke Nova Pro", "Schutzhandschuh Flex", "Sicherheitsschuh Motion", "Verpackungseinheit Standard"][index % 4],
    menge: 12 + ((bestellung.id + index) * 7) % 89,
  }));
  const nummer = bestellung.lieferscheinnummer || `LS-EK-${bestellung.bestellnummer}`;
  const pdf = await lieferscheinPdfErstellen({ lieferscheinnummer: nummer, bestellnummer: bestellung.bestellnummer, lieferant: bestellung.lieferant, datum: bestellung.erstelltAm, positionen });
  return new NextResponse(Buffer.from(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${nummer}.pdf"`, "Cache-Control": "no-store" } });
}
