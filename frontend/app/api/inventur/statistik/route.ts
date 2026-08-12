import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
      gesamt,
      mitBestand,
      ohneBestand,
      gesperrte,
      artikelFuerMindestbestand,
      bestandGesamt,
    ] = await Promise.all([
      prisma.artikel.count(),

      prisma.artikel.count({
        where: {
          bestand: {
            gt: 0,
          },
        },
      }),

      prisma.artikel.count({
        where: {
          bestand: {
            lte: 0,
          },
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
    ]);

    const unterMindestbestand = artikelFuerMindestbestand.filter(
      (artikel) =>
        artikel.mindestbestand > 0 &&
        artikel.bestand < artikel.mindestbestand,
    ).length;

    return NextResponse.json({
      gesamt,
      mitBestand,
      ohneBestand,
      gesperrte,
      unterMindestbestand,
      bestandGesamt: bestandGesamt._sum.bestand ?? 0,
    });
  } catch (error) {
    console.error("INVENTURSTATISTIK:", error);

    return NextResponse.json(
      {
        fehler: "Die Inventurdaten konnten nicht geladen werden.",
      },
      {
        status: 500,
      },
    );
  }
}
