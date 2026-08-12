import { NextRequest, NextResponse } from "next/server";
import { administratorAnfordern, SITZUNGS_COOKIE } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";

const ausfuehren = promisify(execFile);
const backupOrdner = path.join(process.cwd(), "backups");
const tokenHash = (token:string)=>createHash("sha256").update(token).digest("hex");

async function backups() {
  await mkdir(backupOrdner,{recursive:true});
  const dateien=await readdir(backupOrdner);
  return Promise.all(dateien.filter(n=>n.endsWith(".sql")).map(async n=>{const s=await stat(path.join(backupOrdner,n));return{name:n,groesse:s.size,erstelltAm:s.birthtime.toISOString()}}));
}

export async function GET(){
  const admin=await administratorAnfordern();if(!admin)return NextResponse.json({fehler:"Nur für Administratoren."},{status:403});
  const token=(await cookies()).get(SITZUNGS_COOKIE)?.value;
  const aktuell=token?tokenHash(token):"";
  const [sitzungen,protokolle,dateien]=await Promise.all([
    prisma.benutzerSitzung.findMany({include:{benutzer:{select:{vorname:true,nachname:true,personalnummer:true}}},orderBy:{letzteNutzungAm:"desc"}}),
    prisma.systemprotokoll.count(),backups()
  ]);
  return NextResponse.json({sitzungen:sitzungen.map(s=>({id:s.id,benutzer:`${s.benutzer.vorname} ${s.benutzer.nachname}`,personalnummer:s.benutzer.personalnummer,erstelltAm:s.erstelltAm,letzteNutzungAm:s.letzteNutzungAm,laeuftAbAm:s.laeuftAbAm,aktuell:s.tokenHash===aktuell,aktiv:s.laeuftAbAm>new Date()})),protokolle,dateien:dateien.sort((a,b)=>b.erstelltAm.localeCompare(a.erstelltAm)),backupAutomatik:process.env.NOVA_BACKUP_AUTOMATIK==="true"});
}

export async function POST(request:NextRequest){
  const admin=await administratorAnfordern();if(!admin)return NextResponse.json({fehler:"Nur für Administratoren."},{status:403});
  const d=await request.json();
  if(d.aktion==="sitzung-beenden"){
    const token=(await cookies()).get(SITZUNGS_COOKIE)?.value,aktuell=token?tokenHash(token):"";
    const sitzung=await prisma.benutzerSitzung.findUnique({where:{id:String(d.id)}});
    if(!sitzung)return NextResponse.json({fehler:"Sitzung nicht gefunden."},{status:404});
    if(sitzung.tokenHash===aktuell)return NextResponse.json({fehler:"Die aktuell verwendete Sitzung bitte über Abmelden beenden."},{status:400});
    await prisma.benutzerSitzung.delete({where:{id:sitzung.id}});
    await prisma.systemprotokoll.create({data:{modul:"Sicherheit",aktion:"Sitzung administrativ beendet",benutzer:`${admin.vorname} ${admin.nachname}`}});
    return NextResponse.json({meldung:"Sitzung wurde beendet."});
  }
  if(d.aktion==="backup-erstellen"){
    const db=process.env.DATABASE_URL;if(!db?.startsWith("postgres"))return NextResponse.json({fehler:"PostgreSQL-Verbindung ist nicht eingerichtet."},{status:400});
    const u=new URL(db),stamp=new Date().toISOString().replace(/[:.]/g,"-").slice(0,19),ziel=path.join(backupOrdner,`nova-${stamp}.sql`);
    await mkdir(backupOrdner,{recursive:true});
    const standard="C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe";
    const programm=process.env.PG_DUMP_PATH||standard;
    try{await ausfuehren(programm,["--host",u.hostname,"--port",u.port||"5432","--username",decodeURIComponent(u.username),"--dbname",u.pathname.slice(1),"--format=p","--file",ziel],{env:{...process.env,PGPASSWORD:decodeURIComponent(u.password)}})}catch(error){console.error("Backup:",error);return NextResponse.json({fehler:"Backup konnte nicht erstellt werden. PostgreSQL-Werkzeuge oder Zugangsdaten prüfen."},{status:500})}
    await prisma.systemprotokoll.create({data:{modul:"Sicherheit",aktion:"Datenbank-Backup erstellt",details:path.basename(ziel),benutzer:`${admin.vorname} ${admin.nachname}`}});
    return NextResponse.json({meldung:"PostgreSQL-Backup wurde erfolgreich erstellt."});
  }
  return NextResponse.json({fehler:"Unbekannte Aktion."},{status:400});
}
