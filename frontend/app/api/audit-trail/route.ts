import { NextRequest, NextResponse } from "next/server";
import { administratorAnfordern } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!await administratorAnfordern()) return NextResponse.json({ fehler: "Nur Administratoren dürfen den Audit Trail einsehen." }, { status: 403 });
  const q=request.nextUrl.searchParams.get("q")?.trim()??"", modul=request.nextUrl.searchParams.get("modul")?.trim()??"";
  const eintraege=await prisma.systemprotokoll.findMany({where:{...(modul?{modul}:{}),...(q?{OR:[{aktion:{contains:q,mode:"insensitive"}},{benutzer:{contains:q,mode:"insensitive"}},{objektId:{contains:q,mode:"insensitive"}},{details:{contains:q,mode:"insensitive"}}]}:{})},orderBy:{erstelltAm:"desc"},take:500});
  const module=await prisma.systemprotokoll.findMany({select:{modul:true},distinct:["modul"],orderBy:{modul:"asc"}});
  return NextResponse.json({eintraege,module:module.map(m=>m.modul),aktualisiertAm:new Date().toISOString()});
}
