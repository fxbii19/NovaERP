import { NextResponse } from "next/server";
import { aktuellerBenutzer } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!await aktuellerBenutzer()) return NextResponse.json({ fehler: "Bitte zuerst anmelden." }, { status: 401 });
  const [benutzer, bewegungen] = await Promise.all([
    prisma.benutzer.findMany({ where: { aktiv: true }, orderBy: { personalnummer: "asc" }, take: 6 }),
    prisma.lagerbewegung.findMany({ orderBy: { erfasstAm: "desc" }, take: 10 }),
  ]);
  const plaetze = ["WE-01", "A-01-03", "B-02-07", "QS-01", "VERSAND-02", "Nicht zugeordnet"];
  const scanner = benutzer.map((b, index) => {
    const online = index < Math.max(1, benutzer.length - 1);
    const bewegung = bewegungen[index];
    return {
      id: `MDE-${String(index + 1).padStart(3, "0")}`,
      geraet: index % 2 ? "Zebra TC52" : "Honeywell CT45",
      status: online ? "ONLINE" : "OFFLINE",
      mitarbeiter: `${b.vorname} ${b.nachname}`,
      personalnummer: b.personalnummer,
      akku: online ? Math.max(24, 96 - index * 13) : 0,
      wlan: online ? Math.max(38, 94 - index * 9) : 0,
      letzteBuchung: bewegung?.erfasstAm ?? new Date(Date.now() - (index + 1) * 420000),
      buchung: bewegung ? `${bewegung.typ} · ${bewegung.menge}` : "Keine heutige Buchung",
      lagerplatz: plaetze[index % plaetze.length],
    };
  });
  return NextResponse.json({ scanner, aktualisiertAm: new Date().toISOString(), intervallSekunden: 10 });
}
