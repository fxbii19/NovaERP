"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import useLiveUpdates from "@/hooks/useLiveUpdates";
import { ArrowUpRight, CreditCard, PackageCheck, X } from "lucide-react";

type Daten = {
  aktualisiertAm: string;
  systemstatus: "STABIL" | "AUFMERKSAMKEIT";
  kennzahlen: { artikelGesamt: number; kritischeBestaende: number; ohneBestand: number; offeneBestellungen: number; offeneAuftraege: number; offeneQs: number; sperrbestaende: number; offeneMde: number; offeneInventuren: number; versandbereit: number };
  heute: { lagerHeute: number; pruefungenHeute: number; kommissioniertHeute: number; versendetHeute: number };
  umsatz: { versendetHeute: number; bezahltHeute: number; sendungen:Array<{id:number;versandnummer:string;auftragsnummer:string;kunde:string;warenwert:number;versendetAm:string|null;versendetVon:string|null;lieferscheinnummer:string|null}>; zahlungen:Array<{id:number;rechnungsnummer:string;kunde:string;betreff:string;betrag:number;zahlungsart:string;referenz:string|null;gebuchtAm:string;gebuchtVon:string|null}> } | null;
  warnungen: Array<{ stufe: string; titel: string; text: string; href: string }>;
  empfehlungen: string[];
};

function Kennzahl({ label, wert, farbe = "" }: { label: string; wert: number; farbe?: string }) {
  return <div className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5"><p className="text-sm text-[var(--nova-text-schwaecher)]">{label}</p><p className={`mt-2 text-3xl font-bold ${farbe}`}>{wert.toLocaleString("de-DE")}</p></div>;
}

export default function CommandCenter() {
  const [daten, setDaten] = useState<Daten | null>(null);
  const [fehler, setFehler] = useState("");
  const [aktualisiert, setAktualisiert] = useState(false);
  const [laedt, setLaedt] = useState(false);
  const [umsatzDetails, setUmsatzDetails] = useState<"versendet" | "bezahlt" | null>(null);
  const laden = useCallback(async () => {
    setLaedt(true);
    try {
      const response = await fetch(`/api/dashboard/command-center?zeit=${Date.now()}`, { cache: "no-store", headers: { "Cache-Control": "no-cache" } });
      const ergebnis = await response.json();
      if (!response.ok) return setFehler(ergebnis.fehler ?? "Command Center konnte nicht geladen werden.");
      setDaten(ergebnis); setFehler(""); setAktualisiert(true);
      window.setTimeout(() => setAktualisiert(false), 1800);
    } finally {
      setLaedt(false);
    }
  }, []);
  useEffect(() => { void laden(); }, [laden]);
  useLiveUpdates(() => void laden());

  if (fehler) return <div className="mt-8 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-300">{fehler}</div>;
  if (!daten) return <div className="mt-8 rounded-xl border border-[var(--nova-rand)] p-5">NOVA Command Center wird geladen …</div>;

  return <div className="mt-8 space-y-8">
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-6">
      <div><div className="flex items-center gap-3"><span className={`h-3 w-3 rounded-full ${daten.systemstatus === "STABIL" ? "bg-emerald-400" : "bg-amber-400"}`} /><h2 className="text-2xl font-bold">NOVA AI Command Center</h2></div><p className="mt-2 text-sm text-[var(--nova-text-schwaecher)]">Systemstatus: {daten.systemstatus === "STABIL" ? "Alle Kernprozesse stabil" : "Aufmerksamkeit erforderlich"}</p></div>
      <button type="button" disabled={laedt} onClick={() => void laden()} className="rounded-xl bg-[var(--nova-akzent)] px-5 py-3 font-semibold text-white disabled:opacity-60">{laedt ? "Wird aktualisiert …" : aktualisiert ? "✓ Aktualisiert" : "Live aktualisieren"}</button>
    </section>

    <section><h2 className="mb-4 text-xl font-semibold">Live-Informationen</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Kennzahl label="Aktive Artikel" wert={daten.kennzahlen.artikelGesamt} /><Kennzahl label="Offene Aufträge" wert={daten.kennzahlen.offeneAuftraege} />
      <Kennzahl label="Offene Bestellungen" wert={daten.kennzahlen.offeneBestellungen} /><Kennzahl label="Versandbereit" wert={daten.kennzahlen.versandbereit} farbe="text-emerald-400" />
    </div></section>

    {daten.umsatz && <section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-6"><div className="mb-4"><h2 className="text-xl font-semibold">Tagesumsatz</h2><p className="mt-1 text-sm text-[var(--nova-text-schwaecher)]">Nur für Administration und Versandbüro sichtbar</p></div><div className="grid gap-4 sm:grid-cols-2">
      <button type="button" onClick={()=>setUmsatzDetails("versendet")} className="group rounded-xl border border-emerald-500/25 bg-[var(--nova-flaeche)] p-5 text-left transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-lg"><span className="flex items-center justify-between"><span className="text-sm text-[var(--nova-text-schwaecher)]">Heute versendet</span><ArrowUpRight className="text-emerald-400 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" size={20}/></span><span className="mt-2 block text-4xl font-bold text-emerald-400">{daten.umsatz.versendetHeute.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</span><span className="mt-3 block text-xs text-[var(--nova-text-schwaecher)]">{daten.umsatz.sendungen.length} Sendungen · Details öffnen</span></button>
      <button type="button" onClick={()=>setUmsatzDetails("bezahlt")} className="group rounded-xl border border-cyan-500/25 bg-[var(--nova-flaeche)] p-5 text-left transition hover:-translate-y-0.5 hover:border-cyan-400 hover:shadow-lg"><span className="flex items-center justify-between"><span className="text-sm text-[var(--nova-text-schwaecher)]">Heute bezahlt</span><ArrowUpRight className="text-cyan-400 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" size={20}/></span><span className="mt-2 block text-4xl font-bold text-cyan-400">{daten.umsatz.bezahltHeute.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</span><span className="mt-3 block text-xs text-[var(--nova-text-schwaecher)]">{daten.umsatz.zahlungen.length} Zahlungen · Details öffnen</span></button>
    </div></section>}

    {umsatzDetails && daten.umsatz && <UmsatzDialog typ={umsatzDetails} umsatz={daten.umsatz} schliessen={()=>setUmsatzDetails(null)}/>} 

    <section className="grid gap-6 xl:grid-cols-2"><div className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-6"><h2 className="text-xl font-semibold">Kritische Warnungen</h2><div className="mt-4 space-y-3">
      {daten.warnungen.length === 0 ? <p className="rounded-xl bg-emerald-500/10 p-4 text-emerald-300">Keine kritischen Warnungen vorhanden.</p> : daten.warnungen.map((w) => <Link key={w.titel} href={w.href} className={`block rounded-xl border p-4 transition hover:-translate-y-0.5 ${w.stufe === "kritisch" ? "border-red-500/30 bg-red-500/10" : "border-amber-500/30 bg-amber-500/10"}`}><strong>{w.titel}</strong><p className="mt-1 text-sm text-[var(--nova-text-schwaecher)]">{w.text}</p></Link>)}
    </div></div><div className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-6"><h2 className="text-xl font-semibold">NOVA Empfehlungen</h2><div className="mt-4 space-y-3">{daten.empfehlungen.map((text, i) => <div key={text} className="rounded-xl border border-[var(--nova-akzent)]/25 bg-[var(--nova-akzent)]/10 p-4"><span className="mr-2 font-bold text-[var(--nova-akzent)]">{i + 1}.</span>{text}</div>)}</div><p className="mt-4 text-xs text-[var(--nova-text-schwaecher)]">Regelbasierte Empfehlung aus aktuellen ERP-Daten – keine automatische Buchung.</p></div></section>

    <section><h2 className="mb-4 text-xl font-semibold">Tageszusammenfassung</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Kennzahl label="Lagerbewegungen heute" wert={daten.heute.lagerHeute} /><Kennzahl label="QS-Prüfungen heute" wert={daten.heute.pruefungenHeute} />
      <Kennzahl label="Kommissioniert heute" wert={daten.heute.kommissioniertHeute} /><Kennzahl label="Versendet heute" wert={daten.heute.versendetHeute} />
    </div></section>

    <section><h2 className="mb-4 text-xl font-semibold">Offene Aufgaben</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[['MDE bestätigen', daten.kennzahlen.offeneMde, '/lager/produktzugang'], ['QS bearbeiten', daten.kennzahlen.offeneQs, '/qualitaet/pruefauftraege'], ['Inventurdifferenzen', daten.kennzahlen.offeneInventuren, '/lager/inventur'], ['Sperrbestand prüfen', daten.kennzahlen.sperrbestaende, '/qualitaet/sperrbestand'], ['Bestandsrisiken', daten.kennzahlen.kritischeBestaende, '/bestand?filter=kritisch'], ['Artikel ohne Bestand', daten.kennzahlen.ohneBestand, '/bestand']].map(([label, wert, href]) => <Link key={String(label)} href={String(href)} className="flex items-center justify-between rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] px-4 py-4 transition hover:border-[var(--nova-akzent)]"><span>{label}</span><strong>{Number(wert).toLocaleString('de-DE')}</strong></Link>)}</div></section>
    <p className="text-right text-xs text-[var(--nova-text-schwaecher)]">Live-Aktualisierung alle 30 Sekunden · Stand {new Date(daten.aktualisiertAm).toLocaleTimeString("de-DE")}</p>
  </div>;
}

function UmsatzDialog({typ,umsatz,schliessen}:{typ:"versendet"|"bezahlt";umsatz:NonNullable<Daten["umsatz"]>;schliessen:()=>void}){const versendet=typ==="versendet";const summe=versendet?umsatz.versendetHeute:umsatz.bezahltHeute;return <div onMouseDown={e=>{if(e.target===e.currentTarget)schliessen()}} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" className="max-h-[85vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] shadow-2xl"><header className="flex items-center justify-between border-b border-[var(--nova-rand)] p-6"><div className="flex items-center gap-3">{versendet?<PackageCheck className="text-emerald-400"/>:<CreditCard className="text-cyan-400"/>}<div><h2 className="text-2xl font-bold">{versendet?"Heute versendet":"Heute bezahlt"}</h2><p className={`mt-1 text-2xl font-bold ${versendet?"text-emerald-400":"text-cyan-400"}`}>{summe.toLocaleString("de-DE",{style:"currency",currency:"EUR"})}</p></div></div><button onClick={schliessen} className="rounded-xl border border-[var(--nova-rand)] p-3 hover:bg-[var(--nova-flaeche-hover)]" aria-label="Schließen"><X/></button></header><div className="max-h-[65vh] overflow-auto p-6">{versendet?<VersandDetails eintraege={umsatz.sendungen}/>:<ZahlungsDetails eintraege={umsatz.zahlungen}/>}</div></section></div>}
function VersandDetails({eintraege}:{eintraege:NonNullable<Daten["umsatz"]>["sendungen"]}){if(!eintraege.length)return <Leer text="Heute wurde noch keine Sendung verbucht."/>;return <div className="space-y-3">{eintraege.map(s=><div key={s.id} className="grid gap-3 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] p-5 md:grid-cols-[1.4fr_1fr_auto]"><div><b>{s.versandnummer} · {s.auftragsnummer}</b><p className="mt-1 text-sm text-[var(--nova-text-schwaecher)]">{s.kunde}</p><p className="mt-1 text-xs">Lieferschein: {s.lieferscheinnummer??"nicht vorhanden"}</p></div><div className="text-sm"><p>{s.versendetAm?new Date(s.versendetAm).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}):"–"} Uhr</p><p className="text-[var(--nova-text-schwaecher)]">durch {s.versendetVon??"System"}</p></div><b className="text-xl text-emerald-400">{s.warenwert.toLocaleString("de-DE",{style:"currency",currency:"EUR"})}</b></div>)}</div>}
function ZahlungsDetails({eintraege}:{eintraege:NonNullable<Daten["umsatz"]>["zahlungen"]}){if(!eintraege.length)return <Leer text="Heute wurde noch kein Zahlungseingang verbucht."/>;return <div className="space-y-3">{eintraege.map(z=><div key={z.id} className="grid gap-3 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] p-5 md:grid-cols-[1.4fr_1fr_auto]"><div><b>{z.rechnungsnummer} · {z.kunde}</b><p className="mt-1 text-sm text-[var(--nova-text-schwaecher)]">{z.betreff}</p><p className="mt-1 text-xs">Referenz: {z.referenz??"–"}</p></div><div className="text-sm"><p>{new Date(z.gebuchtAm).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})} Uhr · {z.zahlungsart}</p><p className="text-[var(--nova-text-schwaecher)]">gebucht von {z.gebuchtVon??"System"}</p></div><b className="text-xl text-cyan-400">{z.betrag.toLocaleString("de-DE",{style:"currency",currency:"EUR"})}</b></div>)}</div>}
function Leer({text}:{text:string}){return <p className="rounded-2xl border border-dashed border-[var(--nova-rand)] p-10 text-center text-[var(--nova-text-schwaecher)]">{text}</p>}
