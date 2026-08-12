import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { administratorAnfordern } from "@/lib/auth-server";

const MODULE = ["dashboard", "zentrale", "vertrieb", "disposition", "buchhaltung", "cad", "bestellungen", "lager", "konfektion", "logistik", "administration", "novaAi"];
const STANDARD_ROLLEN = [
  { code: "ADMIN", name: "Administrator", beschreibung: "Vollzugriff auf alle NOVA-Module", rechte: MODULE },
  { code: "TEAMLEITER", name: "Teamleiter", beschreibung: "Operative Steuerung ohne Systemadministration", rechte: ["dashboard", "bestellungen", "lager", "konfektion", "logistik", "novaAi"] },
  { code: "SACHBEARBEITER", name: "Sachbearbeiter", beschreibung: "Bearbeitung freigegebener Geschäftsprozesse", rechte: ["dashboard", "bestellungen", "lager", "konfektion", "logistik", "novaAi"] },
  { code: "MITARBEITER", name: "Mitarbeiter", beschreibung: "Grundzugriff auf operative Erfassungen", rechte: ["dashboard", "lager", "novaAi"] },
];
const STANDARD_EINSTELLUNGEN = [
  ["firma.name", "NOVA Demo GmbH", "TEXT", "Unternehmen", "Firmenname"],
  ["firma.waehrung", "EUR", "TEXT", "Unternehmen", "Währung"],
  ["system.sprache", "de-DE", "TEXT", "System", "Standardsprache"],
  ["system.zeitzone", "Europe/Berlin", "TEXT", "System", "Zeitzone"],
  ["lager.negativeBestaende", "false", "BOOLEAN", "Lager", "Negative Bestände erlauben"],
  ["inventur.adminBuchung", "true", "BOOLEAN", "Lager", "Inventurbuchung nur durch Admin"],
  ["protokoll.aufbewahrungTage", "365", "NUMBER", "Sicherheit", "Protokoll-Aufbewahrung in Tagen"],
] as const;

async function standardSicherstellen() {
  if ((await prisma.rollenprofil.count()) === 0) {
    await prisma.rollenprofil.createMany({ data: STANDARD_ROLLEN.map((r) => ({ code: r.code, name: r.name, beschreibung: r.beschreibung, rechteJson: JSON.stringify(r.rechte), systemrolle: true })) });
  }
  if ((await prisma.systemeinstellung.count()) === 0) {
    await prisma.systemeinstellung.createMany({ data: STANDARD_EINSTELLUNGEN.map(([schluessel, wert, typ, kategorie, bezeichnung]) => ({ schluessel, wert, typ, kategorie, bezeichnung })) });
  }
}

export async function GET() {
  try {
    const admin = await administratorAnfordern();
    if (!admin) return NextResponse.json({ fehler: "Nur Administratoren dürfen diesen Bereich öffnen." }, { status: 403 });
    await standardSicherstellen();
    const [rollen, einstellungen, protokolle] = await Promise.all([
      prisma.rollenprofil.findMany({ orderBy: { id: "asc" } }),
      prisma.systemeinstellung.findMany({ orderBy: [{ kategorie: "asc" }, { bezeichnung: "asc" }] }),
      prisma.systemprotokoll.findMany({ orderBy: { erstelltAm: "desc" }, take: 500 }),
    ]);
    return NextResponse.json({ rollen, einstellungen, protokolle, module: MODULE });
  } catch (error) {
    console.error("Administration konnte nicht geladen werden:", error);
    return NextResponse.json({ fehler: "Administrationsdaten konnten nicht geladen werden." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await administratorAnfordern();
    const benutzer = admin ? `${admin.vorname} ${admin.nachname}`.trim() : "";
    if (!admin) return NextResponse.json({ fehler: "Nur Administratoren dürfen Systemeinstellungen ändern." }, { status: 403 });
    const daten = await request.json();
    const aktion = String(daten.aktion ?? "");

    if (aktion === "rolle-speichern") {
      const code = String(daten.code ?? "").trim().toUpperCase();
      const rechte = Array.isArray(daten.rechte) ? daten.rechte.filter((r: unknown) => typeof r === "string" && MODULE.includes(r)) : [];
      if (!code || !String(daten.name ?? "").trim()) return NextResponse.json({ fehler: "Code und Rollenname sind erforderlich." }, { status: 400 });
      const profil = await prisma.rollenprofil.upsert({
        where: { code },
        create: { code, name: String(daten.name).trim(), beschreibung: String(daten.beschreibung ?? "").trim() || null, rechteJson: JSON.stringify(rechte) },
        update: { name: String(daten.name).trim(), beschreibung: String(daten.beschreibung ?? "").trim() || null, rechteJson: JSON.stringify(rechte), aktiv: daten.aktiv !== false },
      });
      await prisma.systemprotokoll.create({ data: { modul: "Administration", aktion: "Rolle gespeichert", details: `${profil.code}: ${profil.name}`, benutzer } });
      return NextResponse.json(profil);
    }

    if (aktion === "einstellung-speichern") {
      const einstellung = await prisma.systemeinstellung.update({ where: { id: Number(daten.id) }, data: { wert: String(daten.wert ?? ""), aktualisiertVon: benutzer } });
      await prisma.systemprotokoll.create({ data: { modul: "Systemeinstellungen", aktion: "Einstellung geändert", details: `${einstellung.schluessel} = ${einstellung.wert}`, benutzer } });
      return NextResponse.json(einstellung);
    }

    if (aktion === "protokoll") {
      const eintrag = await prisma.systemprotokoll.create({ data: { modul: String(daten.modul ?? "System"), aktion: String(daten.protokollAktion ?? "Aktion"), details: String(daten.details ?? "").trim() || null, stufe: String(daten.stufe ?? "INFO"), benutzer } });
      return NextResponse.json(eintrag);
    }

    return NextResponse.json({ fehler: "Unbekannte Administrationsaktion." }, { status: 400 });
  } catch (error) {
    console.error("Administrationsaktion fehlgeschlagen:", error);
    return NextResponse.json({ fehler: "Administrationsaktion ist fehlgeschlagen." }, { status: 500 });
  }
}
