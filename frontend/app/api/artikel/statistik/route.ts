import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
      gesamt,
      aktive,
      gesperrte,
      artikelFuerMindestbestand,
      bestandGesamt,
      reserviertGesamt,
      verfuegbarGesamt,
    ] = await Promise.all([
      prisma.artikel.count(),

      prisma.artikel.count({
        where: {
          aktiv: true,
        },
      }),

      prisma.artikel.count({
        where: {
          gesperrt: true,
        },
      }),

      prisma.artikel.findMany({
        select: {
          bestand: true,
          mindestbestand: true,
        },
      }),

      prisma.artikel.aggregate({
        _sum: {
          bestand: true,
        },
      }),

      prisma.artikel.aggregate({
        _sum: {
          reserviert: true,
        },
      }),

      prisma.artikel.aggregate({
        _sum: {
          verfuegbar: true,
        },
      }),
    ]);

    const unterMindestbestand = artikelFuerMindestbestand.filter(
      (artikel) =>
        artikel.mindestbestand > 0 &&
        artikel.bestand < artikel.mindestbestand
    ).length;

    return NextResponse.json({
      gesamt,
      aktive,
      gesperrte,
      unterMindestbestand,
      bestandGesamt: bestandGesamt._sum.bestand ?? 0,
      reserviertGesamt: reserviertGesamt._sum.reserviert ?? 0,
      verfuegbarGesamt: verfuegbarGesamt._sum.verfuegbar ?? 0,
    });
  } catch (error) {
    console.error(
      "Artikelstatistik konnte nicht geladen werden:",
      error
    );

    return NextResponse.json(
      {
        fehler: "Artikelstatistik konnte nicht geladen werden.",
      },
      {
        status: 500,
      }
    );
  }
}