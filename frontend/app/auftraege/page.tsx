"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import NovaSidebar from "@/components/NovaSidebar";

type Position = {
  id: number;
  menge: number;
  einzelpreis: number;
  kommissionierteMenge: number;
  artikel: { artikelnummer: string; produktname: string; groesse: string | null; variante: string | null };
};

type Auftrag = {
  id: number;
  auftragsnummer: string;
  kunde: string;
  kundenreferenz: string | null;
  lieferadresse: string | null;
  status: string;
  prioritaet: string;
  liefertermin: string | null;
  notiz: string | null;
  erstelltVon: string | null;
  erstelltAm: string;
  positionen: Position[];
};

const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

function statusText(status: string) {
  const texte: Record<string, string> = {
    OFFEN: "Offen", KOMMISSIONIERUNG: "In Kommissionierung", KOMMISSIONIERT: "Kommissioniert",
    VERLADUNG: "In Verladung", VERSANDBEREIT: "Versandbereit", VERSENDET: "Versendet", STORNIERT: "Storniert",
  };
  return texte[status] ?? status.replaceAll("_", " ");
}

function statusFarbe(status: string) {
  if (status === "VERSENDET") return "border-emerald-500/25 bg-emerald-500/15 text-emerald-400";
  if (status === "STORNIERT") return "border-slate-500/25 bg-slate-500/15 text-slate-400";
  if (status === "OFFEN") return "border-blue-500/25 bg-blue-500/15 text-blue-400";
  return "border-amber-500/25 bg-amber-500/15 text-amber-400";
}

function auftragswert(auftrag: Auftrag) {
  return auftrag.positionen.reduce((summe, position) => summe + position.menge * position.einzelpreis, 0);
}

export default function AuftraegePage() {
  const [auftraege, setAuftraege] = useState<Auftrag[]>([]);
  const [suche, setSuche] = useState("");
  const [ausgewaehlt, setAusgewaehlt] = useState<number | null>(null);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState("");

  const laden = useCallback(async () => {
    setLaedt(true); setFehler("");
    try {
      const antwort = await fetch(`/api/logistik?zeit=${Date.now()}`, { cache: "no-store" });
      const daten = await antwort.json();
      if (!antwort.ok) throw new Error(daten.fehler || "Aufträge konnten nicht geladen werden.");
      const liste = Array.isArray(daten.auftraege) ? daten.auftraege : [];
      setAuftraege(liste);
      setAusgewaehlt((aktuell) => aktuell && liste.some((a: Auftrag) => a.id === aktuell) ? aktuell : liste[0]?.id ?? null);
    } catch (error) {
      setFehler(error instanceof Error ? error.message : "Aufträge konnten nicht geladen werden.");
    } finally { setLaedt(false); }
  }, []);

  useEffect(() => { void laden(); }, [laden]);

  const gefiltert = useMemo(() => {
    const text = suche.trim().toLocaleLowerCase("de-DE");
    if (!text) return auftraege;
    return auftraege.filter((auftrag) => [auftrag.auftragsnummer, auftrag.kunde, auftrag.kundenreferenz, auftrag.lieferadresse, auftrag.status, auftrag.erstelltVon, ...auftrag.positionen.flatMap((p) => [p.artikel.artikelnummer, p.artikel.produktname, p.artikel.groesse, p.artikel.variante])].some((wert) => String(wert ?? "").toLocaleLowerCase("de-DE").includes(text)));
  }, [auftraege, suche]);

  const detail = auftraege.find((auftrag) => auftrag.id === ausgewaehlt) ?? null;
  const gesamtwert = auftraege.reduce((summe, auftrag) => summe + auftragswert(auftrag), 0);

  return <main className="min-h-screen bg-[var(--nova-hintergrund)] text-[var(--nova-text)]">
    <NovaSidebar />
    <section className="mx-auto max-w-[1500px] px-8 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--nova-akzent)]">Vertrieb & Logistik</p><h1 className="mt-2 text-4xl font-bold">Auftragsverwaltung</h1><p className="mt-2 text-[var(--nova-text-schwaecher)]">Kundenaufträge von der Erfassung bis zum Versand verfolgen.</p></div>
        <div className="flex gap-3"><button type="button" onClick={() => void laden()} disabled={laedt} className="rounded-xl border border-[var(--nova-rand)] px-5 py-3 font-semibold transition hover:border-[var(--nova-akzent)] hover:text-[var(--nova-akzent)] disabled:opacity-50">{laedt ? "Wird geladen …" : "Aktualisieren"}</button><Link href="/logistik/auftraege" className="rounded-xl bg-[var(--nova-akzent)] px-5 py-3 font-semibold text-white transition hover:brightness-110">+ Neuer Auftrag</Link></div>
      </div>

      {fehler && <div className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-red-400">{fehler}</div>}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kennzahl titel="Aufträge gesamt" wert={auftraege.length} />
        <Kennzahl titel="Offene Aufträge" wert={auftraege.filter((a) => a.status !== "VERSENDET" && a.status !== "STORNIERT").length} farbe="text-amber-400" />
        <Kennzahl titel="Versendet" wert={auftraege.filter((a) => a.status === "VERSENDET").length} farbe="text-emerald-400" />
        <Kennzahl titel="Gesamtwert" wert={euro.format(gesamtwert)} farbe="text-[var(--nova-akzent)]" />
      </div>

      <div className="mt-8 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-4"><input value={suche} onChange={(event) => setSuche(event.target.value)} placeholder="Auftrag, Kunde, Artikel, Größe oder Variante suchen …" className="w-full rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-4 py-3 outline-none transition focus:border-[var(--nova-akzent)]" /></div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)]">
          <div className="border-b border-[var(--nova-rand)] px-5 py-4 font-semibold">Aufträge ({gefiltert.length})</div>
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-[var(--nova-hintergrund)]/60 text-[var(--nova-text-schwaecher)]"><tr>{["Status", "Auftragsnummer", "Kunde", "Referenz", "Positionen", "Priorität", "Wert", "Erstellt"].map((titel) => <th key={titel} className="px-5 py-4">{titel}</th>)}</tr></thead><tbody>{gefiltert.map((auftrag) => <tr key={auftrag.id} onClick={() => setAusgewaehlt(auftrag.id)} className={`cursor-pointer border-t border-[var(--nova-rand)] transition hover:bg-[var(--nova-flaeche-hover)] ${auftrag.id === ausgewaehlt ? "bg-[var(--nova-akzent-transparent)]" : ""}`}><td className="px-5 py-4"><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusFarbe(auftrag.status)}`}>{statusText(auftrag.status)}</span></td><td className="px-5 py-4 font-semibold text-[var(--nova-akzent)]">{auftrag.auftragsnummer}</td><td className="px-5 py-4">{auftrag.kunde}</td><td className="px-5 py-4 text-[var(--nova-text-schwaecher)]">{auftrag.kundenreferenz || "–"}</td><td className="px-5 py-4">{auftrag.positionen.length}</td><td className="px-5 py-4">{auftrag.prioritaet}</td><td className="px-5 py-4 font-medium">{euro.format(auftragswert(auftrag))}</td><td className="px-5 py-4">{new Date(auftrag.erstelltAm).toLocaleDateString("de-DE")}</td></tr>)}</tbody></table></div>
          {!laedt && gefiltert.length === 0 && <div className="p-10 text-center text-[var(--nova-text-schwaecher)]">Keine passenden Aufträge gefunden.</div>}
        </div>

        <aside className="h-fit rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-6">{detail ? <><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Auftragsdetails</h2><span className={`rounded-full border px-3 py-1 text-xs ${statusFarbe(detail.status)}`}>{statusText(detail.status)}</span></div><p className="mt-4 text-2xl font-bold text-[var(--nova-akzent)]">{detail.auftragsnummer}</p><div className="mt-6 space-y-4"><Detail label="Kunde" wert={detail.kunde} /><Detail label="Kundenreferenz" wert={detail.kundenreferenz || "–"} /><Detail label="Lieferadresse" wert={detail.lieferadresse || "–"} /><Detail label="Liefertermin" wert={detail.liefertermin ? new Date(detail.liefertermin).toLocaleDateString("de-DE") : "–"} /><Detail label="Bearbeiter" wert={detail.erstelltVon || "–"} /><Detail label="Auftragswert" wert={euro.format(auftragswert(detail))} /></div><div className="mt-6 border-t border-[var(--nova-rand)] pt-5"><h3 className="font-semibold">Positionen</h3><div className="mt-3 space-y-3">{detail.positionen.map((position) => <div key={position.id} className="rounded-xl bg-[var(--nova-hintergrund)]/50 p-3 text-sm"><b>{position.artikel.artikelnummer}</b><p className="mt-1 text-[var(--nova-text-schwaecher)]">{position.artikel.produktname}</p><p className="mt-1">{position.menge.toLocaleString("de-DE")} × {euro.format(position.einzelpreis)}</p></div>)}</div></div></> : <p className="text-[var(--nova-text-schwaecher)]">Kein Auftrag ausgewählt.</p>}</aside>
      </div>
    </section>
  </main>;
}

function Kennzahl({ titel, wert, farbe = "" }: { titel: string; wert: string | number; farbe?: string }) { return <div className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5"><p className="text-sm text-[var(--nova-text-schwaecher)]">{titel}</p><p className={`mt-3 text-3xl font-bold ${farbe}`}>{wert}</p></div>; }
function Detail({ label, wert }: { label: string; wert: string }) { return <div><p className="text-xs uppercase tracking-wide text-[var(--nova-text-schwaecher)]">{label}</p><p className="mt-1 font-medium">{wert}</p></div>; }
