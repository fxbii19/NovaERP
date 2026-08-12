"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import NovaSidebar from "@/components/NovaSidebar";

type Bestellung = {
  id: number;
  bestellnummer: string;
  lieferant: string;
  status: string;
  gesamtpositionen: number;
  erstelltAm: string;
};

export default function EinkaufPage() {
  const [bestellungen, setBestellungen] = useState<Bestellung[]>([]);
  const [laedt, setLaedt] = useState(true);

  useEffect(() => {
    fetch("/api/bestellungen", { cache: "no-store" })
      .then((antwort) => antwort.json())
      .then((daten) => setBestellungen(Array.isArray(daten) ? daten : []))
      .catch(() => setBestellungen([]))
      .finally(() => setLaedt(false));
  }, []);

  const kennzahlen = useMemo(() => ({
    gesamt: bestellungen.length,
    offen: bestellungen.filter((b) => b.status.toLowerCase() === "offen").length,
    abgeschlossen: bestellungen.filter((b) => b.status.toLowerCase() === "abgeschlossen").length,
    lieferanten: new Set(bestellungen.map((b) => b.lieferant.trim().toLowerCase())).size,
  }), [bestellungen]);

  const letzteBestellungen = [...bestellungen]
    .sort((a, b) => new Date(b.erstelltAm).getTime() - new Date(a.erstelltAm).getTime())
    .slice(0, 5);

  return (
    <main className="min-h-screen bg-[var(--nova-hintergrund)] text-[var(--nova-text)]">
      <NovaSidebar />
      <section className="ml-20 px-8 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--nova-akzent)]">Beschaffung</p>
              <h1 className="mt-2 text-4xl font-bold">Einkauf</h1>
              <p className="mt-2 text-[var(--nova-text-schwaecher)]">Bestellungen, Lieferanten und offene Beschaffungsvorgänge im Blick behalten.</p>
            </div>
            <Link href="/bestellungen" className="rounded-xl bg-[var(--nova-akzent)] px-5 py-3 font-semibold text-white transition hover:-translate-y-0.5">
              Bestellungen öffnen
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Kennzahl titel="Bestellungen gesamt" wert={kennzahlen.gesamt} />
            <Kennzahl titel="Offene Bestellungen" wert={kennzahlen.offen} farbe="text-amber-400" />
            <Kennzahl titel="Abgeschlossen" wert={kennzahlen.abgeschlossen} farbe="text-emerald-400" />
            <Kennzahl titel="Aktive Lieferanten" wert={kennzahlen.lieferanten} farbe="text-sky-400" />
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <section className="overflow-hidden rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)]">
              <div className="flex items-center justify-between border-b border-[var(--nova-rand)] px-6 py-5">
                <div><h2 className="text-xl font-semibold">Letzte Bestellungen</h2><p className="mt-1 text-sm text-[var(--nova-text-schwaecher)]">Die zuletzt angelegten Einkaufsvorgänge</p></div>
                <Link href="/bestellungen" className="text-sm font-semibold text-[var(--nova-akzent)]">Alle anzeigen →</Link>
              </div>
              <div className="divide-y divide-[var(--nova-rand)]">
                {laedt && <p className="p-6 text-[var(--nova-text-schwaecher)]">Einkaufsdaten werden geladen...</p>}
                {!laedt && letzteBestellungen.length === 0 && <p className="p-6 text-[var(--nova-text-schwaecher)]">Noch keine Bestellungen vorhanden.</p>}
                {letzteBestellungen.map((b) => <div key={b.id} className="flex items-center justify-between gap-4 px-6 py-4"><div><p className="font-semibold">{b.bestellnummer}</p><p className="mt-1 text-sm text-[var(--nova-text-schwaecher)]">{b.lieferant} · {b.gesamtpositionen} Positionen</p></div><Status status={b.status} /></div>)}
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-6">
              <h2 className="text-xl font-semibold">Schnellzugriff</h2>
              <p className="mt-1 text-sm text-[var(--nova-text-schwaecher)]">Häufige Aufgaben im Einkauf</p>
              <div className="mt-5 space-y-3">
                <Schnellzugriff href="/bestellungen" titel="Bestellungen verwalten" text="Offene und abgeschlossene Vorgänge prüfen" />
                <Schnellzugriff href="/einkauf/lieferanten" titel="Lieferantenübersicht" text="Bezugsquellen und Bestellaktivität vergleichen" />
                <Schnellzugriff href="/lager/produktzugang" titel="Wareneingang bestätigen" text="Erfasste Lieferungen am PC übernehmen" />
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

function Kennzahl({ titel, wert, farbe = "text-[var(--nova-text)]" }: { titel: string; wert: number; farbe?: string }) {
  return <div className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-6"><p className="text-sm text-[var(--nova-text-schwaecher)]">{titel}</p><p className={`mt-3 text-3xl font-bold ${farbe}`}>{wert.toLocaleString("de-DE")}</p></div>;
}

function Schnellzugriff({ href, titel, text }: { href: string; titel: string; text: string }) {
  return <Link href={href} className="block rounded-xl border border-[var(--nova-rand)] p-4 transition hover:border-[var(--nova-akzent)] hover:bg-[var(--nova-flaeche-hover)]"><p className="font-semibold">{titel}</p><p className="mt-1 text-sm text-[var(--nova-text-schwaecher)]">{text}</p></Link>;
}

function Status({ status }: { status: string }) {
  const klasse = status.toLowerCase() === "offen" ? "bg-amber-500/15 text-amber-300" : status.toLowerCase() === "abgeschlossen" ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-500/15 text-slate-300";
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${klasse}`}>{status}</span>;
}
