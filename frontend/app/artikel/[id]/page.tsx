"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Daten = {
  artikel: { artikelnummer: string; produktname: string; groesse: string | null; variante: string | null; bestand: number; reserviert: number; verfuegbar: number; verkaufspreis: number; gesperrt: boolean; lagerplaetze: Array<{ code: string; bezeichnung: string; menge: number }> };
  ereignisse: Array<{ id: string; zeit: string; typ: string; titel: string; beschreibung: string; benutzer?: string | null; href?: string }>;
};

export default function ArtikelTimelinePage() {
  const { id } = useParams<{ id: string }>();
  const [daten, setDaten] = useState<Daten | null>(null);
  const [fehler, setFehler] = useState("");
  useEffect(() => { fetch(`/api/artikel/${id}/timeline`, { cache: "no-store" }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.fehler); setDaten(d); }).catch((e) => setFehler(e.message)); }, [id]);
  if (fehler) return <main className="p-10 text-red-300">{fehler}</main>;
  if (!daten) return <main className="p-10">Artikelhistorie wird geladen …</main>;
  const a = daten.artikel;
  return <main className="min-h-screen bg-[var(--nova-hintergrund)] p-8 text-[var(--nova-text)]"><div className="mx-auto max-w-6xl">
    <Link href="/bestand" className="text-sm text-[var(--nova-akzent)]">← Zurück zum Bestand</Link>
    <div className="mt-5 flex flex-wrap items-start justify-between gap-5"><div><p className="text-sm text-[var(--nova-akzent)]">{a.artikelnummer}</p><h1 className="mt-1 text-4xl font-bold">{a.produktname}</h1><p className="mt-2 text-[var(--nova-text-schwaecher)]">{a.variante ?? "Keine Variante"} · Größe {a.groesse ?? "–"}</p></div><span className={`rounded-full px-4 py-2 text-sm font-semibold ${a.gesperrt ? "bg-red-500/15 text-red-300" : "bg-emerald-500/15 text-emerald-300"}`}>{a.gesperrt ? "Gesperrt" : "Aktiv"}</span></div>
    <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Bestand", a.bestand], ["Reserviert", a.reserviert], ["Verfügbar", a.verfuegbar], ["Verkaufspreis", a.verkaufspreis.toLocaleString("de-DE", { style: "currency", currency: "EUR" })]].map(([l, v]) => <div key={String(l)} className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5"><p className="text-sm text-[var(--nova-text-schwaecher)]">{l}</p><p className="mt-2 text-2xl font-bold">{typeof v === "number" ? v.toLocaleString("de-DE") : v}</p></div>)}</section>
    <section className="mt-6 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5"><h2 className="text-lg font-semibold">Aktuelle Lagerplätze</h2><div className="mt-3 flex flex-wrap gap-3">{a.lagerplaetze.length ? a.lagerplaetze.map((l) => <div key={l.code} className="rounded-xl border border-[var(--nova-rand)] px-4 py-3"><strong>{l.code}</strong><p className="text-sm text-[var(--nova-text-schwaecher)]">{l.bezeichnung} · {l.menge.toLocaleString("de-DE")}</p></div>) : <p className="text-[var(--nova-text-schwaecher)]">Keinem Lagerplatz zugeordnet.</p>}</div></section>
    <section className="mt-8"><h2 className="text-2xl font-bold">Artikel-Timeline</h2><p className="mt-1 text-sm text-[var(--nova-text-schwaecher)]">Alle in NOVA aufgezeichneten Ereignisse, neuestes zuerst.</p><div className="mt-6 space-y-0">{daten.ereignisse.map((e, index) => <div key={e.id} className="relative grid grid-cols-[32px_1fr] gap-4 pb-6"><div className="relative flex justify-center"><span className="z-10 mt-2 h-3 w-3 rounded-full bg-[var(--nova-akzent)]" />{index < daten.ereignisse.length - 1 && <span className="absolute bottom-0 top-4 w-px bg-[var(--nova-rand)]" />}</div><div className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5"><div className="flex flex-wrap justify-between gap-3"><div><span className="text-xs font-semibold uppercase text-[var(--nova-akzent)]">{e.typ}</span><h3 className="mt-1 font-semibold">{e.titel}</h3></div><time className="text-sm text-[var(--nova-text-schwaecher)]">{new Date(e.zeit).toLocaleString("de-DE")}</time></div><p className="mt-2 text-sm text-[var(--nova-text-schwaecher)]">{e.beschreibung}</p><div className="mt-3 flex justify-between text-xs text-[var(--nova-text-schwaecher)]"><span>{e.benutzer ? `Erfasst von ${e.benutzer}` : "Systemereignis"}</span>{e.href && <Link href={e.href} className="text-[var(--nova-akzent)]">Vorgang öffnen →</Link>}</div></div></div>)}</div></section>
  </div></main>;
}
