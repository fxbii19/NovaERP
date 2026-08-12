import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [gesamt, offen, abgeschlossen, storniert] =
      await Promise.all([
        prisma.bestellung.count(),

        prisma.bestellung.count({
          where: {
            status: "Offen",
          },
        }),

        prisma.bestellung.count({
          where: {
            status: "Abgeschlossen",
          },
        }),

        prisma.bestellung.count({
          where: {
            status: "Storniert",
          },
        }),
      ]);

    return NextResponse.json({
      gesamt,
      offen,
      abgeschlossen,
      storniert,
    });
  } catch (error) {
    console.error("BESTELLUNGSSTATISTIK:", error);

    return NextResponse.json(
      {
        fehler: "Bestellungen konnten nicht geladen werden.",
      },
      {
        status: 500,
      }
    );
  }
}