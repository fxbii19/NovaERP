import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { administratorAnfordern } from "@/lib/auth-server";
import { cacheLeeren, cacheStatus } from "@/lib/server-cache";

export const dynamic = "force-dynamic";
async function statusLaden() {
  const start = performance.now(); await prisma.$queryRaw`SELECT 1`; const datenbankMs = Math.round((performance.now() - start) * 10) / 10;
  const [wartend, laufend, fehler, erledigt, aktiveSitzungen] = await Promise.all([
    prisma.hintergrundauftrag.count({ where: { status: "WARTEND" } }), prisma.hintergrundauftrag.count({ where: { status: "LAEUFT" } }), prisma.hintergrundauftrag.count({ where: { status: "FEHLER" } }), prisma.hintergrundauftrag.count({ where: { status: "ERLEDIGT" } }), prisma.benutzerSitzung.count({ where: { laeuftAbAm: { gt: new Date() } } }),
  ]);
  return { datenbankMs, cache: cacheStatus(), jobs: { wartend, laufend, fehler, erledigt }, aktiveSitzungen, liveUpdateSekunden: 15, datenbank: datenbankMs < 100 ? "STABIL" : "LANGSAM", aktualisiertAm: new Date().toISOString() };
}
export async function GET() { const admin = await administratorAnfordern(); if (!admin) return NextResponse.json({ fehler: "Nur für Administratoren." }, { status: 403 }); try { return NextResponse.json(await statusLaden()); } catch (error) { console.error("Performance-Status:", error); return NextResponse.json({ fehler: "Performance-Status konnte nicht geladen werden." }, { status: 500 }); } }
export async function POST(request: NextRequest) {
  const admin = await administratorAnfordern(); if (!admin) return NextResponse.json({ fehler: "Nur für Administratoren." }, { status: 403 });
  const daten = await request.json(); const aktion = String(daten.aktion ?? ""); const benutzer = `${admin.vorname} ${admin.nachname}`;
  if (aktion === "cache-leeren") { cacheLeeren(); await prisma.systemprotokoll.create({ data: { modul: "Performance", aktion: "Server-Cache geleert", benutzer } }); return NextResponse.json(await statusLaden()); }
  if (aktion === "wartung-planen") { const job = await prisma.hintergrundauftrag.create({ data: { typ: "SYSTEMWARTUNG", payloadJson: JSON.stringify({ sitzungenBereinigen: true }), prioritaet: 50 } }); return NextResponse.json(job); }
  if (aktion === "jobs-ausfuehren") {
    const jobs = await prisma.hintergrundauftrag.findMany({ where: { status: "WARTEND", typ: "SYSTEMWARTUNG", ausfuehrenAb: { lte: new Date() } }, orderBy: [{ prioritaet: "asc" }, { erstelltAm: "asc" }], take: 20 });
    for (const job of jobs) { try { await prisma.hintergrundauftrag.update({ where: { id: job.id }, data: { status: "LAEUFT", gestartetAm: new Date(), versuche: { increment: 1 } } }); if (job.typ === "SYSTEMWARTUNG") await prisma.benutzerSitzung.deleteMany({ where: { laeuftAbAm: { lt: new Date() } } }); await prisma.hintergrundauftrag.update({ where: { id: job.id }, data: { status: "ERLEDIGT", abgeschlossenAm: new Date(), fehler: null } }); } catch (error) { await prisma.hintergrundauftrag.update({ where: { id: job.id }, data: { status: "FEHLER", fehler: error instanceof Error ? error.message.slice(0, 500) : "Unbekannter Fehler" } }); } }
    await prisma.systemprotokoll.create({ data: { modul: "Performance", aktion: "Hintergrundaufträge verarbeitet", details: `${jobs.length} Auftrag/Aufträge`, benutzer } }); return NextResponse.json(await statusLaden());
  }
  return NextResponse.json({ fehler: "Unbekannte Aktion." }, { status: 400 });
}
