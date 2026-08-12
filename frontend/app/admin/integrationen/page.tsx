"use client";

import { useEffect, useState } from "react";
import { Cable, Mail, Printer, ScanLine, ServerCog } from "lucide-react";

type Daten = Record<string, { status: string; [key: string]: unknown }>;

export default function IntegrationenPage() {
  const [daten,setDaten]=useState<Daten|null>(null),[meldung,setMeldung]=useState("");
  async function laden(){const r=await fetch("/api/administration/integrationen",{cache:"no-store"}),j=await r.json();setMeldung(r.ok?"":j.fehler);if(r.ok)setDaten(j)}
  useEffect(()=>{void laden()},[]);
  async function smtpTest(){const r=await fetch("/api/administration/integrationen",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({aktion:"smtp-test"})}),j=await r.json();setMeldung(j.meldung??j.fehler)}
  const karten=[
    ["smtp","E-Mail-Server",Mail,"Externe E-Mails werden nach Einrichtung direkt über SMTP versendet."],
    ["restApi","Externe REST API",Cable,"Abgesicherter API-Endpunkt für externe Anwendungen und ERP-Systeme."],
    ["scanner","Scanner & MDE",ScanLine,"Kamera, QR-Code sowie USB- und Bluetooth-Handscanner."],
    ["drucker","Drucker",Printer,"Dokumente verwenden den Systemdruckdialog und installierte Firmendrucker."],
    ["erp","ERP-Schnittstellen",ServerCog,"Grundlage für REST-, Excel- und CSV-Datenaustausch."],
  ] as const;
  return <main className="min-h-screen bg-[var(--nova-hintergrund)] p-8 pl-28 text-[var(--nova-text)]"><div className="mx-auto max-w-7xl"><p className="text-sm font-bold uppercase tracking-[.24em] text-[var(--nova-akzent)]">Administration</p><h1 className="mt-1 text-4xl font-bold">Integrationen</h1><p className="mt-2 text-[var(--nova-text-schwaecher)]">Externe Dienste, Geräte und Schnittstellen zentral überwachen.</p>{meldung&&<p className="mt-6 rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-4">{meldung}</p>}<div className="mt-8 grid gap-5 md:grid-cols-2">{karten.map(([id,titel,Icon,text])=>{const d=daten?.[id];return <section key={id} className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-6"><div className="flex items-start justify-between gap-4"><div className="flex gap-4"><span className="rounded-xl bg-[var(--nova-akzent-transparent)] p-3 text-[var(--nova-akzent)]"><Icon/></span><div><h2 className="text-xl font-bold">{titel}</h2><p className="mt-1 text-sm text-[var(--nova-text-schwaecher)]">{text}</p></div></div><span className="whitespace-nowrap rounded-full bg-[var(--nova-akzent-transparent)] px-3 py-1 text-xs text-[var(--nova-akzent)]">{d?.status??"WIRD GELADEN"}</span></div>{id==="smtp"&&<button onClick={()=>void smtpTest()} className="mt-5 rounded-xl border border-[var(--nova-rand)] px-4 py-2 hover:border-[var(--nova-akzent)]">Verbindung testen</button>}{id==="drucker"&&<button onClick={()=>window.print()} className="mt-5 rounded-xl border border-[var(--nova-rand)] px-4 py-2 hover:border-[var(--nova-akzent)]">Druckdialog testen</button>}{id==="restApi"&&d&&<code className="mt-5 block rounded-xl bg-[var(--nova-hintergrund)] p-3 text-sm">GET {String(d.endpunkt)}</code>}</section>})}</div><section className="mt-6 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-6"><h2 className="text-xl font-bold">Benötigte Server-Einstellungen</h2><p className="mt-2 text-sm text-[var(--nova-text-schwaecher)]">Die geheimen Werte werden ausschließlich in .env.local hinterlegt und niemals in der Oberfläche angezeigt.</p><pre className="mt-4 overflow-auto rounded-xl bg-[var(--nova-hintergrund)] p-4 text-sm">SMTP_HOST={"<server>"}{"\n"}SMTP_PORT=587{"\n"}SMTP_USER={"<benutzer>"}{"\n"}SMTP_PASSWORD={"<passwort>"}{"\n"}SMTP_FROM={"<absender>"}{"\n"}NOVA_EXTERNAL_API_KEY={"<sicherer-schluessel>"}</pre></section></div></main>
}
