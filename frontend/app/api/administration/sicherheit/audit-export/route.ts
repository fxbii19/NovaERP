import { NextResponse } from "next/server";
import { administratorAnfordern } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

const csv=(v:unknown)=>`"${String(v??"").replaceAll('"','""')}"`;
export async function GET(){
  if(!await administratorAnfordern())return NextResponse.json({fehler:"Nur für Administratoren."},{status:403});
  const logs=await prisma.systemprotokoll.findMany({orderBy:{erstelltAm:"desc"},take:10000});
  const inhalt=["Zeitpunkt;Modul;Aktion;Details;Stufe;Benutzer",...logs.map(l=>[l.erstelltAm.toISOString(),l.modul,l.aktion,l.details,l.stufe,l.benutzer].map(csv).join(";"))].join("\r\n");
  return new NextResponse("\uFEFF"+inhalt,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="NOVA_Audit_${new Date().toISOString().slice(0,10)}.csv"`}});
}
