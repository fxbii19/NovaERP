import "server-only";
import { prisma } from "@/lib/prisma";

type AuditDaten = {
  modul: string;
  aktion: string;
  benutzer: string;
  objektTyp?: string;
  objektId?: string | number;
  alterWert?: unknown;
  neuerWert?: unknown;
  grund?: string;
};

function serialisieren(wert: unknown) {
  if (wert === undefined) return null;
  if (wert === null) return "null";
  return typeof wert === "string" ? wert : JSON.stringify(wert);
}

export async function auditSpeichern(daten: AuditDaten) {
  return prisma.systemprotokoll.create({ data: {
    modul: daten.modul,
    aktion: daten.aktion,
    benutzer: daten.benutzer,
    objektTyp: daten.objektTyp ?? null,
    objektId: daten.objektId === undefined ? null : String(daten.objektId),
    alterWert: serialisieren(daten.alterWert),
    neuerWert: serialisieren(daten.neuerWert),
    grund: daten.grund?.trim() || "Betrieblicher Vorgang",
  }});
}
