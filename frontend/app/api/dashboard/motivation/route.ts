import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aktuellerBenutzer } from "@/lib/auth-server";

const SPRUECHE = [
  "Heute ist ein guter Tag, um Abläufe ein Stück besser zu machen.",
  "Mit einem klaren ersten Schritt kommt der ganze Tag in Bewegung.",
  "Gute Arbeit entsteht dort, wo Aufmerksamkeit auf Erfahrung trifft.",
  "Jede saubere Buchung macht den nächsten Arbeitsschritt leichter.",
  "Gemeinsam läuft der Betrieb besser – danke für deinen Beitrag.",
  "Ein ruhiger Start und klare Prioritäten bringen dich sicher durch den Tag.",
  "Heute zählt nicht Perfektion, sondern verlässlicher Fortschritt.",
  "Kleine Verbesserungen ergeben am Ende einen großen Unterschied.",
  "Starte fokussiert, arbeite sorgfältig und behalte das Wesentliche im Blick.",
  "NOVA ist bereit – machen wir gemeinsam etwas Gutes aus diesem Tag.",
];

const datumFormat = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const stundeFormat = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  hour: "2-digit",
  hour12: false,
});

export async function POST() {
  const benutzer = await aktuellerBenutzer();
  if (!benutzer) return NextResponse.json({ fehler: "Anmeldung erforderlich." }, { status: 401 });

  const jetzt = new Date();
  const stunde = Number(stundeFormat.format(jetzt));
  const videoDemoModus = benutzer.personalnummer === "10001";
  if (!videoDemoModus && stunde >= 12) return new NextResponse(null, { status: 204 });

  const datenbankBenutzer = await prisma.benutzer.findUnique({
    where: { id: benutzer.id },
    select: { letzteMotivationAm: true },
  });
  if (!videoDemoModus && datenbankBenutzer?.letzteMotivationAm && datumFormat.format(datenbankBenutzer.letzteMotivationAm) === datumFormat.format(jetzt)) {
    return new NextResponse(null, { status: 204 });
  }

  if (!videoDemoModus) {
    await prisma.benutzer.update({
      where: { id: benutzer.id },
      data: { letzteMotivationAm: jetzt },
    });
  }

  const tag = Number(new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", day: "2-digit" }).format(jetzt));
  const index = (benutzer.id * 31 + tag) % SPRUECHE.length;
  return NextResponse.json({
    anrede: `Guten Morgen, ${benutzer.vorname}!`,
    spruch: SPRUECHE[index],
  });
}
