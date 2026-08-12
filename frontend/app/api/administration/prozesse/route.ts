import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { administratorAnfordern } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const admin = await administratorAnfordern();
  if (!admin) return NextResponse.json({ fehler: "Nur Administratoren dürfen diese Übersicht öffnen." }, { status: 403 });

  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  const jetzt = new Date();

  try {
    const [lagerbuchungenHeute, offeneMdeVorgaenge, pruefungenHeute, qsAbweichungenHeute,
      offenePruefauftraege, kommissionierungenHeute, offeneKommissionierungen, sendungenHeute,
      versandbereit, aktiveBenutzer, aktiveSitzungen, abteilungen] = await Promise.all([
      prisma.lagerbewegung.count({ where: { erfasstAm: { gte: heute } } }),
      prisma.lagerbewegung.count({ where: { status: "ERFASST" } }),
      prisma.qualitaetspruefung.count({ where: { geprueftAm: { gte: heute } } }),
      prisma.qualitaetspruefung.count({ where: { geprueftAm: { gte: heute }, ergebnis: "ABWEICHUNG" } }),
      prisma.pruefauftrag.count({ where: { status: { in: ["OFFEN", "FREIGABE_OFFEN"] } } }),
      prisma.kommissionierung.count({ where: { abgeschlossenAm: { gte: heute } } }),
      prisma.kommissionierung.count({ where: { status: { in: ["OFFEN", "IN_ARBEIT"] } } }),
      prisma.versand.count({ where: { versendetAm: { gte: heute } } }),
      prisma.versand.count({ where: { status: "BEREIT" } }),
      prisma.benutzer.count({ where: { aktiv: true } }),
      prisma.benutzerSitzung.count({ where: { laeuftAbAm: { gt: jetzt } } }),
      prisma.benutzer.groupBy({ by: ["abteilung"], where: { aktiv: true }, _count: { _all: true }, orderBy: { abteilung: "asc" } }),
    ]);

    const qsAbweichungsquote = pruefungenHeute > 0 ? Math.round((qsAbweichungenHeute / pruefungenHeute) * 1000) / 10 : 0;
    const response = NextResponse.json({
      aktualisiertAm: jetzt.toISOString(),
      heute: { lagerbuchungenHeute, pruefungenHeute, qsAbweichungenHeute, qsAbweichungsquote, kommissionierungenHeute, sendungenHeute },
      offen: { offeneMdeVorgaenge, offenePruefauftraege, offeneKommissionierungen, versandbereit },
      system: { aktiveBenutzer, aktiveSitzungen },
      abteilungen: abteilungen.map((eintrag) => ({ name: eintrag.abteilung, aktiveBenutzer: eintrag._count._all })),
    });
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return response;
  } catch (error) {
    console.error("Team- und Prozessübersicht:", error);
    return NextResponse.json({ fehler: "Die Prozesskennzahlen konnten nicht geladen werden." }, { status: 500 });
  }
}
