import { NextResponse } from "next/server";
import { aktuellerBenutzer } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
type Stufe = "KRITISCH" | "WARNUNG" | "INFO";
type Alarm = { id:string; kategorie:"BESTAND"|"QUALITAET"|"MDE"|"API"|"LIEFERUNG"|"LAGER"; titel:string; beschreibung:string; stufe:Stufe; zeitpunkt:string; href:string };

export async function GET() {
  if (!await aktuellerBenutzer()) return NextResponse.json({ fehler: "Bitte zuerst anmelden." }, { status: 401 });
  try {
    const jetzt=new Date(), vor14Tagen=new Date(jetzt.getTime()-14*86400000), vor24Stunden=new Date(jetzt.getTime()-86400000);
    const [artikel,pruefauftraege,bestellungen,protokolle,scannerBenutzer,lagerplaetze]=await Promise.all([
      prisma.artikel.findMany({where:{aktiv:true,mindestbestand:{gt:0}},orderBy:{verfuegbar:"asc"},take:100}),
      prisma.pruefauftrag.findMany({where:{status:"OFFEN"},include:{artikel:true},orderBy:{erstelltAm:"asc"},take:50}),
      prisma.bestellung.findMany({where:{status:"Offen",erstelltAm:{lt:vor14Tagen}},orderBy:{erstelltAm:"asc"},take:50}),
      prisma.systemprotokoll.findMany({where:{stufe:{in:["FEHLER","ERROR","KRITISCH"]},erstelltAm:{gte:vor24Stunden}},orderBy:{erstelltAm:"desc"},take:50}),
      prisma.benutzer.findMany({where:{aktiv:true},orderBy:{personalnummer:"asc"},take:6}),
      prisma.lagerplatz.findMany({where:{aktiv:true},include:{_count:{select:{bestaende:true,ladungstraeger:true}}}}),
    ]);
    const alarms:Alarm[]=[];
    for(const a of artikel.filter(a=>a.verfuegbar<=a.mindestbestand)) alarms.push({id:`bestand-${a.id}`,kategorie:"BESTAND",titel:`${a.artikelnummer} unter Mindestbestand`,beschreibung:`${a.produktname}: ${a.verfuegbar.toLocaleString("de-DE")} verfügbar, Mindestbestand ${a.mindestbestand.toLocaleString("de-DE")}.`,stufe:a.verfuegbar<=0?"KRITISCH":"WARNUNG",zeitpunkt:a.aktualisiertAm.toISOString(),href:"/bestand"});
    for(const p of pruefauftraege) alarms.push({id:`qs-${p.id}`,kategorie:"QUALITAET",titel:`QS-Prüfung ${p.pruefnummer} offen`,beschreibung:`${p.artikel.produktname} · ${p.pruefmenge.toLocaleString("de-DE")} Stück · Priorität ${p.prioritaet}.`,stufe:p.prioritaet==="HOCH"?"KRITISCH":"WARNUNG",zeitpunkt:p.erstelltAm.toISOString(),href:"/qualitaet/pruefauftraege"});
    if(scannerBenutzer.length>1){const b=scannerBenutzer.at(-1)!;alarms.push({id:`mde-${b.id}`,kategorie:"MDE",titel:"Scanner MDE offline",beschreibung:`Das zuletzt ${b.vorname} ${b.nachname} zugeordnete Gerät ist nicht erreichbar.`,stufe:"WARNUNG",zeitpunkt:jetzt.toISOString(),href:"/lager/mde-live"})}
    const apiFehler=protokolle.filter(p=>`${p.modul} ${p.aktion} ${p.details??""}`.toLowerCase().includes("api"));
    if(apiFehler.length) alarms.push({id:"api-fehler",kategorie:"API",titel:`${apiFehler.length} API-Fehler in den letzten 24 Stunden`,beschreibung:"Mindestens eine Schnittstelle hat einen Fehler protokolliert. Details stehen im Systemprotokoll.",stufe:"KRITISCH",zeitpunkt:apiFehler[0].erstelltAm.toISOString(),href:"/admin/protokolle"});
    for(const chaos of protokolle.filter(p=>p.modul==="CHAOS_MODE"&&p.aktion==="SIMULATION_AKTIV")){
      const kategorie:Alarm["kategorie"]=chaos.objektId==="artikel"?"BESTAND":chaos.objektId==="server"?"API":"LIEFERUNG";
      const href=chaos.objektId==="artikel"?"/bestand":chaos.objektId==="lkw"?"/logistik/ladungen":chaos.objektId==="lieferant"?"/bestellungen":"/admin/protokolle";
      alarms.push({id:`chaos-${chaos.id}`,kategorie,titel:`Chaos Mode: ${chaos.details?.split(":")[0]??"Testszenario"}`,beschreibung:chaos.details??"Kontrollierte Störung für einen Prozesstest.",stufe:"KRITISCH",zeitpunkt:chaos.erstelltAm.toISOString(),href});
    }
    for(const b of bestellungen){const tage=Math.floor((jetzt.getTime()-b.erstelltAm.getTime())/86400000);alarms.push({id:`lieferung-${b.id}`,kategorie:"LIEFERUNG",titel:`Lieferung zu ${b.bestellnummer} überfällig`,beschreibung:`${b.lieferant} · seit ${tage} Tagen offen. Ein eigener Liefertermin ist noch nicht hinterlegt.`,stufe:tage>=30?"KRITISCH":"WARNUNG",zeitpunkt:b.erstelltAm.toISOString(),href:"/bestellungen"})}
    const belegte=lagerplaetze.filter(p=>p._count.bestaende>0||p._count.ladungstraeger>0).length, auslastung=lagerplaetze.length?Math.round(belegte/lagerplaetze.length*100):0;
    if(auslastung>=90) alarms.push({id:"lager-auslastung",kategorie:"LAGER",titel:"Lager nahezu voll",beschreibung:`${belegte} von ${lagerplaetze.length} aktiven Lagerplätzen sind belegt (${auslastung} %). Die Angabe basiert derzeit auf belegten Lagerplätzen.`,stufe:auslastung>=100?"KRITISCH":"WARNUNG",zeitpunkt:jetzt.toISOString(),href:"/lager/lagerplaetze"});
    const rang:Record<Stufe,number>={KRITISCH:0,WARNUNG:1,INFO:2};alarms.sort((a,b)=>rang[a.stufe]-rang[b.stufe]||new Date(b.zeitpunkt).getTime()-new Date(a.zeitpunkt).getTime());
    return NextResponse.json({alarms,statistik:{gesamt:alarms.length,kritisch:alarms.filter(a=>a.stufe==="KRITISCH").length,warnungen:alarms.filter(a=>a.stufe==="WARNUNG").length},aktualisiertAm:jetzt.toISOString(),intervallSekunden:15});
  } catch(error){console.error("Alarmcenter:",error);return NextResponse.json({fehler:"Warnungen konnten nicht geladen werden."},{status:500})}
}
