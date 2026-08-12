import { NextRequest, NextResponse } from "next/server";
import { aktuellerBenutzer, passwortHashErstellen, passwortPruefen } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const aktuell = await aktuellerBenutzer();
  if (!aktuell) return NextResponse.json({ fehler: "Nicht angemeldet." }, { status: 401 });
  const benutzer = await prisma.benutzer.findUnique({ where: { id: aktuell.id }, select: { letzteAnmeldungAm: true } });
  return NextResponse.json({ letzteAnmeldungAm: benutzer?.letzteAnmeldungAm ?? null });
}

export async function PATCH(request: NextRequest) {
  const aktuell = await aktuellerBenutzer();
  if (!aktuell) return NextResponse.json({ fehler: "Nicht angemeldet." }, { status: 401 });
  const daten = await request.json();
  const aktuellesPasswort = String(daten.aktuellesPasswort ?? "");
  const neuesPasswort = String(daten.neuesPasswort ?? "");
  if (neuesPasswort.length < 4) return NextResponse.json({ fehler: "Das neue Passwort benötigt mindestens 4 Zeichen." }, { status: 400 });
  const benutzer = await prisma.benutzer.findUnique({ where: { id: aktuell.id } });
  if (!benutzer || !(await passwortPruefen(aktuellesPasswort, benutzer.passwortHash))) return NextResponse.json({ fehler: "Das aktuelle Passwort ist nicht korrekt." }, { status: 400 });
  await prisma.benutzer.update({ where: { id: aktuell.id }, data: { passwortHash: await passwortHashErstellen(neuesPasswort) } });
  await prisma.systemprotokoll.create({ data: { modul: "SICHERHEIT", aktion: "PASSWORT_GEÄNDERT", benutzer: `${aktuell.vorname} ${aktuell.nachname}` } });
  return NextResponse.json({ erfolg: true });
}
