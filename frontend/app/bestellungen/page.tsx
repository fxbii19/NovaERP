"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import NovaSidebar from "@/components/NovaSidebar";

type Bestellposition = { position: number; artikelnummer: string; bezeichnung: string; menge: number; erfasstMenge: number; restMenge: number; erfassungsstatus: "OFFEN" | "TEILWEISE" | "VOLLSTAENDIG"; zuletztErfasstAm: string | null };
type Bestellung = { id: number; bestellnummer: string; lieferscheinnummer: string | null; lieferant: string; status: string; gesamtpositionen: number; erstelltAm: string; positionen: Bestellposition[] };

export default function BestellungenSeite() {
  const [bestellungen, setBestellungen] = useState<Bestellung[]>([]);
  const [suche, setSuche] = useState("");
  const [status, setStatus] = useState("ALLE");
  const [laedt, setLaedt] = useState(true);
  const [bearbeitet, setBearbeitet] = useState<number | null>(null);
  const [fehler, setFehler] = useState("");
  const [geoeffnet, setGeoeffnet] = useState<Bestellung | null>(null);
  const [detailAnsicht, setDetailAnsicht] = useState<"bestellung" | "lieferschein">("bestellung");

  function laden() {
    setLaedt(true);
    fetch("/api/bestellungen", { cache: "no-store" })
      .then((antwort) => antwort.json())
      .then((daten) => setBestellungen(Array.isArray(daten) ? daten : []))
      .catch(() => setBestellungen([]))
      .finally(() => setLaedt(false));
  }

  useEffect(() => laden(), []);

  async function statusAendern(id: number, neuerStatus: "Abgeschlossen" | "Storniert") {
    setBearbeitet(id);
    setFehler("");
    try {
      const antwort = await fetch("/api/bestellungen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: neuerStatus }),
      });
      const daten = await antwort.json();
      if (!antwort.ok) throw new Error(daten.fehler ?? "Status konnte nicht geändert werden.");
      laden();
    } catch (error) {
      setFehler(error instanceof Error ? error.message : "Status konnte nicht geändert werden.");
    } finally {
      setBearbeitet(null);
    }
  }

  const gefiltert = useMemo(() => bestellungen.filter((b) => {
    const passtSuche = `${b.bestellnummer} ${b.lieferant}`.toLowerCase().includes(suche.trim().toLowerCase());
    const passtStatus = status === "ALLE" || b.status.toUpperCase() === status;
    return passtSuche && passtStatus;
  }), [bestellungen, suche, status]);

  const offen = bestellungen.filter((b) => b.status.toLowerCase() === "offen").length;
  const positionen = bestellungen.reduce((summe, b) => summe + b.gesamtpositionen, 0);

  return (
    <main className="min-h-screen bg-[var(--nova-hintergrund)] text-[var(--nova-text)]">
      <NovaSidebar />
      <section className="ml-20 px-8 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--nova-akzent)]">Einkauf</p><h1 className="mt-2 text-4xl font-bold">Bestellungen</h1><p className="mt-2 text-[var(--nova-text-schwaecher)]">Bestellvorgänge prüfen und Wareneingänge weiterbearbeiten.</p></div>
            <div className="flex gap-3"><button onClick={laden} className="rounded-xl border border-[var(--nova-rand)] px-5 py-3 font-semibold transition hover:bg-[var(--nova-flaeche-hover)]">Aktualisieren</button><Link href="/lager/produktzugang" className="rounded-xl bg-[var(--nova-akzent)] px-5 py-3 font-semibold text-white">Wareneingang bestätigen</Link></div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Karte titel="Bestellungen gesamt" wert={bestellungen.length} />
            <Karte titel="Offene Bestellungen" wert={offen} farbe="text-amber-400" />
            <Karte titel="Positionen gesamt" wert={positionen} farbe="text-sky-400" />
          </div>

          <div className="mt-8 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-4">
            <div className="flex flex-wrap gap-3"><input value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Bestellnummer oder Lieferant suchen..." className="min-w-72 flex-1 rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-4 py-3 outline-none focus:border-[var(--nova-akzent)]" /><select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-4 py-3 outline-none"><option value="ALLE">Alle Status</option><option value="OFFEN">Offen</option><option value="ABGESCHLOSSEN">Abgeschlossen</option><option value="STORNIERT">Storniert</option></select></div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--nova-rand)]">
            <table className="w-full text-sm"><thead className="bg-[var(--nova-flaeche)]"><tr>{["Bestellnummer", "Lieferschein", "Lieferant", "Positionen", "Status", "Erstellt", "Aktion"].map((titel) => <th key={titel} className="px-5 py-4 text-left">{titel}</th>)}</tr></thead><tbody>
              {gefiltert.map((b) => <tr key={b.id} className="border-t border-[var(--nova-rand)] transition hover:bg-[var(--nova-flaeche-hover)]"><td className="px-5 py-4"><button type="button" onClick={() => { setDetailAnsicht("bestellung"); setGeoeffnet(b); }} className="font-semibold text-[var(--nova-akzent)] underline-offset-4 transition hover:text-[var(--nova-akzent-hover)] hover:underline">{b.bestellnummer}</button></td><td className="px-5 py-4"><button type="button" onClick={() => { setDetailAnsicht("lieferschein"); setGeoeffnet(b); }} className="font-medium text-sky-300 underline-offset-4 transition hover:text-sky-200 hover:underline">{b.lieferscheinnummer ?? "–"}</button></td><td className="px-5 py-4">{b.lieferant}</td><td className="px-5 py-4">{b.gesamtpositionen}</td><td className="px-5 py-4"><Status status={b.status} /></td><td className="px-5 py-4">{new Date(b.erstelltAm).toLocaleDateString("de-DE")}</td><td className="px-5 py-4">{b.status.toLowerCase() === "offen" ? <div className="flex gap-2"><button disabled={bearbeitet === b.id} onClick={() => void statusAendern(b.id, "Abgeschlossen")} className="rounded-lg bg-[var(--nova-akzent)] px-3 py-2 font-semibold text-white transition hover:bg-[var(--nova-akzent-hover)] disabled:opacity-50">Abschließen</button><button disabled={bearbeitet === b.id} onClick={() => void statusAendern(b.id, "Storniert")} className="rounded-lg border border-red-500/40 px-3 py-2 text-red-300 transition hover:bg-red-500/15 disabled:opacity-50">Stornieren</button></div> : <span className="text-[var(--nova-text-schwaecher)]">Erledigt</span>}</td></tr>)}
              {!laedt && gefiltert.length === 0 && <tr><td colSpan={7} className="px-5 py-16 text-center text-[var(--nova-text-schwaecher)]">Keine passenden Bestellungen gefunden.</td></tr>}
              {laedt && <tr><td colSpan={7} className="px-5 py-16 text-center text-[var(--nova-text-schwaecher)]">Bestellungen werden geladen...</td></tr>}
            </tbody></table>
          </div>
          {fehler && <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-300">{fehler}</p>}
          <p className="mt-3 text-sm text-[var(--nova-text-schwaecher)]">{gefiltert.length} von {bestellungen.length} Bestellungen angezeigt</p>
        </div>
      </section>
      {geoeffnet && <BestellDetails bestellung={geoeffnet} startAnsicht={detailAnsicht} onSchliessen={() => setGeoeffnet(null)} />}
    </main>
  );
}

function BestellDetails({ bestellung, startAnsicht, onSchliessen }: { bestellung: Bestellung; startAnsicht: "bestellung" | "lieferschein"; onSchliessen: () => void }) {
  const [ansicht, setAnsicht] = useState(startAnsicht);
  const positionen = bestellung.positionen;
  const offenePositionen = positionen.filter((position) => position.erfassungsstatus !== "VOLLSTAENDIG").length;

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm" onMouseDown={onSchliessen}>
    <section onMouseDown={(event) => event.stopPropagation()} className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-7 shadow-2xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div className="flex gap-2"><button type="button" onClick={() => setAnsicht("bestellung")} className={`rounded-xl px-4 py-2 font-semibold transition ${ansicht === "bestellung" ? "bg-[var(--nova-akzent)] text-white" : "border border-[var(--nova-rand)] hover:bg-[var(--nova-flaeche-hover)]"}`}>Bestellung</button><button type="button" onClick={() => setAnsicht("lieferschein")} className={`rounded-xl px-4 py-2 font-semibold transition ${ansicht === "lieferschein" ? "bg-[var(--nova-akzent)] text-white" : "border border-[var(--nova-rand)] hover:bg-[var(--nova-flaeche-hover)]"}`}>Papier-Lieferschein</button></div><button type="button" onClick={onSchliessen} className="rounded-xl border border-[var(--nova-rand)] px-4 py-2 transition hover:bg-[var(--nova-flaeche-hover)]">Schließen</button></div>
      {ansicht === "bestellung" ? <><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--nova-akzent)]">Einkaufsbeleg</p><h2 className="mt-2 text-3xl font-bold">{bestellung.bestellnummer}</h2><p className="mt-2 text-[var(--nova-text-schwaecher)]">Lieferant: {bestellung.lieferant}</p></div><div className="mt-6 grid gap-4 sm:grid-cols-3"><BelegInfo titel="Lieferschein" wert={bestellung.lieferscheinnummer ?? "Nicht vorhanden"} /><BelegInfo titel="Status" wert={bestellung.status} /><BelegInfo titel="Bestelldatum" wert={new Date(bestellung.erstelltAm).toLocaleDateString("de-DE")} /></div>{offenePositionen > 0 ? <div className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-300"><b>Achtung: {offenePositionen} {offenePositionen === 1 ? "Position wurde" : "Positionen wurden"} noch nicht vollständig erfasst.</b><p className="mt-1 text-sm">Die fehlenden Mengen sind in der Tabelle rot bzw. gelb markiert.</p></div> : <div className="mt-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-300"><b>Alle Bestellpositionen wurden vollständig am MDE erfasst.</b></div>}<PositionsTabelle positionen={positionen} papier={false} /><p className="mt-5 text-sm text-[var(--nova-text-schwaecher)]">Demo-Daten für die NOVA-Präsentation. Die Positionen werden später durch echte Bestellpositionen ersetzt.</p></> : <PapierLieferschein bestellung={bestellung} positionen={positionen} />}
    </section>
  </div>;
}

function PapierLieferschein({ bestellung, positionen }: { bestellung: Bestellung; positionen: Bestellposition[] }) {
  return <div className="relative mx-auto min-h-[900px] max-w-[760px] bg-white p-12 text-slate-900 shadow-2xl">
    <a href={`/api/dokumente/lieferschein/${bestellung.id}`} target="_blank" rel="noreferrer" className="absolute right-4 top-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">PDF öffnen</a>
    <div className="flex items-start justify-between border-b-2 border-emerald-600 pb-7"><div><p className="text-3xl font-black tracking-tight text-emerald-600">NOVA DEMO SUPPLY</p><p className="mt-2 text-sm text-slate-500">Industriestraße 24 · 10115 Berlin</p><p className="text-sm text-slate-500">Tel. +49 30 555 010 · lieferung@nova-demo.de</p></div><div className="text-right"><h2 className="text-3xl font-light uppercase tracking-wider">Lieferschein</h2><p className="mt-3 font-bold">{bestellung.lieferscheinnummer}</p></div></div>
    <div className="mt-10 grid grid-cols-2 gap-10"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Empfänger</p><p className="mt-3 text-lg font-bold">NOVA ERP Warenannahme</p><p>Logistikzentrum 1</p><p>04109 Leipzig</p></div><div className="space-y-2 text-sm"><div className="flex justify-between border-b py-1"><span className="text-slate-500">Bestellnummer</span><b>{bestellung.bestellnummer}</b></div><div className="flex justify-between border-b py-1"><span className="text-slate-500">Lieferdatum</span><b>{new Date(bestellung.erstelltAm).toLocaleDateString("de-DE")}</b></div><div className="flex justify-between border-b py-1"><span className="text-slate-500">Lieferant</span><b>{bestellung.lieferant}</b></div></div></div>
    <PositionsTabelle positionen={positionen} papier />
    <p className="mt-8 text-sm leading-6 text-slate-600">Die oben aufgeführten Waren wurden vollständig und in ordnungsgemäßem Zustand zur Anlieferung bereitgestellt. Dieser Beleg wurde automatisch für die NOVA-ERP-Demonstration erzeugt.</p>
    <div className="mt-20 grid grid-cols-2 gap-16 text-sm"><div className="border-t border-slate-400 pt-2">Unterschrift Lieferant</div><div className="border-t border-slate-400 pt-2">Warenannahme / Datum</div></div>
    <div className="mt-16 text-center font-mono text-lg tracking-[0.35em] text-slate-700">*{bestellung.lieferscheinnummer}*</div>
  </div>;
}

function PositionsTabelle({ positionen, papier }: { positionen: Bestellposition[]; papier: boolean }) {
  const spalten = papier ? ["Position", "Artikelnummer", "Bezeichnung", "Menge"] : ["Position", "Artikelnummer", "Bezeichnung", "Bestellt", "Erfasst", "Fehlt", "MDE-Status"];
  return <div className={`mt-8 overflow-x-auto border ${papier ? "border-slate-300" : "rounded-2xl border-[var(--nova-rand)]"}`}><table className="w-full text-sm"><thead className={papier ? "bg-slate-100" : "bg-[var(--nova-hintergrund)]"}><tr>{spalten.map((titel) => <th key={titel} className="whitespace-nowrap px-5 py-4 text-left">{titel}</th>)}</tr></thead><tbody>{positionen.map((position) => <tr key={position.position} className={papier ? "border-t border-slate-200" : "border-t border-[var(--nova-rand)]"}><td className="px-5 py-4">{position.position}</td><td className={`px-5 py-4 ${papier ? "font-medium" : "text-[var(--nova-akzent)]"}`}>{position.artikelnummer}</td><td className="px-5 py-4">{position.bezeichnung}</td><td className="whitespace-nowrap px-5 py-4">{position.menge} Stk.</td>{!papier && <><td className="whitespace-nowrap px-5 py-4 text-emerald-300">{position.erfasstMenge} Stk.</td><td className={`whitespace-nowrap px-5 py-4 font-bold ${position.restMenge > 0 ? "text-red-300" : "text-emerald-300"}`}>{position.restMenge} Stk.</td><td className="px-5 py-4"><Erfassungsstatus status={position.erfassungsstatus} /></td></>}</tr>)}</tbody></table></div>;
}

function Erfassungsstatus({ status }: { status: Bestellposition["erfassungsstatus"] }) {
  const daten = status === "VOLLSTAENDIG" ? ["Vollständig", "bg-emerald-500/15 text-emerald-300"] : status === "TEILWEISE" ? ["Teilweise", "bg-amber-500/15 text-amber-300"] : ["Nicht erfasst", "bg-red-500/15 text-red-300"];
  return <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${daten[1]}`}>{daten[0]}</span>;
}

function BelegInfo({ titel, wert }: { titel: string; wert: string }) {
  return <div className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)]/50 p-4"><p className="text-xs text-[var(--nova-text-schwaecher)]">{titel}</p><p className="mt-2 font-semibold">{wert}</p></div>;
}

function Karte({ titel, wert, farbe = "text-[var(--nova-text)]" }: { titel: string; wert: number; farbe?: string }) {
  return <div className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5"><p className="text-sm text-[var(--nova-text-schwaecher)]">{titel}</p><p className={`mt-2 text-3xl font-bold ${farbe}`}>{wert.toLocaleString("de-DE")}</p></div>;
}

function Status({ status }: { status: string }) {
  const klasse = status.toLowerCase() === "offen" ? "bg-amber-500/15 text-amber-300" : status.toLowerCase() === "abgeschlossen" ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300";
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${klasse}`}>{status}</span>;
}
