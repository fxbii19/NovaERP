import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const erwartet = process.env.NOVA_EXTERNAL_API_KEY;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!erwartet || token !== erwartet) return NextResponse.json({ fehler: "API-Schlüssel fehlt oder ist ungültig." }, { status: 401 });
  const artikel = await prisma.artikel.findMany({ orderBy: { artikelnummer: "asc" }, take: 1000 });
  return NextResponse.json({ version: "v1", anzahl: artikel.length, artikel, zeitpunkt: new Date().toISOString() });
}
