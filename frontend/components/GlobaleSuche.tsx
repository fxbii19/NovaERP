"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Suchdaten = {
  artikel: Array<{ id: number; artikelnummer: string; produktname: string; groesse: string | null; variante: string | null; verfuegbar: number; lagerplatz: string | null }>;
  bestellungen: Array<{ id: number; bestellnummer: string; lieferant: string; status: string }>;
  lagerplaetze: Array<{ id: number; code: string; bezeichnung: string; bereich: string }>;
  auftraege: Array<{ id: number; auftragsnummer: string; kunde: string; status: string }>;
  lieferscheine: Array<{ id: number; lieferscheinnummer: string; versand: { auftrag: { auftragsnummer: string; kunde: string } } }>;
};

export default function GlobaleSuche() {
  const [offen, setOffen] = useState(false);
  const [text, setText] = useState("");
  const [daten, setDaten] = useState<Suchdaten | null>(null);
  const [laedt, setLaedt] = useState(false);
  const eingabe = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function taste(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOffen(true); }
      if (event.key === "Escape") setOffen(false);
    }
    function externOeffnen() { setOffen(true); }
    window.addEventListener("keydown", taste);
    window.addEventListener("nova-suche-oeffnen", externOeffnen);
    return () => {
      window.removeEventListener("keydown", taste);
      window.removeEventListener("nova-suche-oeffnen", externOeffnen);
    };
  }, []);
  useEffect(() => { if (offen) window.setTimeout(() => eingabe.current?.focus(), 50); }, [offen]);
  useEffect(() => {
    if (text.trim().length < 2) { setDaten(null); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLaedt(true);
      try { const response = await fetch(`/api/suche?q=${encodeURIComponent(text.trim())}`, { signal: controller.signal }); if (response.ok) setDaten(await response.json()); }
      finally { setLaedt(false); }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [text]);

  const anzahl = daten ? daten.artikel.length + daten.bestellungen.length + daten.lagerplaetze.length + daten.auftraege.length + daten.lieferscheine.length : 0;
  return <>
    {offen && <div className="fixed inset-0 z-[100] bg-black/70 p-4 pt-[8vh] backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setOffen(false)}>
      <div className="mx-auto max-h-[82vh] max-w-3xl overflow-hidden rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] shadow-2xl">
        <div className="flex items-center gap-3 border-b border-[var(--nova-rand)] p-4"><span className="text-xl">🔍</span><input ref={eingabe} value={text} onChange={(e) => setText(e.target.value)} placeholder="Artikel, Größe, Farbe, Auftrag, Lagerplatz …" className="min-w-0 flex-1 bg-transparent text-lg outline-none" /><button onClick={() => setOffen(false)} className="rounded-lg px-3 py-2 text-[var(--nova-text-schwaecher)] hover:bg-[var(--nova-flaeche-hover)]">ESC</button></div>
        <div className="max-h-[68vh] overflow-y-auto p-4">
          {text.length < 2 && <p className="py-10 text-center text-[var(--nova-text-schwaecher)]">Mindestens zwei Zeichen eingeben. Mehrere Begriffe können kombiniert werden.</p>}
          {laedt && <p className="py-6 text-center">NOVA sucht …</p>}
          {!laedt && daten && anzahl === 0 && <p className="py-10 text-center text-[var(--nova-text-schwaecher)]">Keine passenden NOVA-Daten gefunden.</p>}
          {!laedt && daten && <div className="space-y-5">
            {daten.artikel.length > 0 && <Gruppe titel="Artikel">{daten.artikel.map((a) => <Treffer key={a.id} href={`/artikel/${a.id}`} titel={`${a.produktname}${a.variante ? ` · ${a.variante}` : ""}${a.groesse ? ` · Größe ${a.groesse}` : ""}`} text={`${a.artikelnummer} · Verfügbar ${a.verfuegbar.toLocaleString("de-DE")} · Timeline öffnen`} onClick={() => setOffen(false)} />)}</Gruppe>}
            {daten.bestellungen.length > 0 && <Gruppe titel="Bestellungen">{daten.bestellungen.map((b) => <Treffer key={b.id} href="/bestellungen" titel={b.bestellnummer} text={`${b.lieferant} · ${b.status}`} onClick={() => setOffen(false)} />)}</Gruppe>}
            {daten.lagerplaetze.length > 0 && <Gruppe titel="Lagerplätze">{daten.lagerplaetze.map((l) => <Treffer key={l.id} href="/lager/lagerplaetze" titel={`${l.code} · ${l.bezeichnung}`} text={l.bereich} onClick={() => setOffen(false)} />)}</Gruppe>}
            {daten.auftraege.length > 0 && <Gruppe titel="Aufträge">{daten.auftraege.map((a) => <Treffer key={a.id} href="/logistik/auftraege" titel={a.auftragsnummer} text={`${a.kunde} · ${a.status}`} onClick={() => setOffen(false)} />)}</Gruppe>}
            {daten.lieferscheine.length > 0 && <Gruppe titel="Lieferscheine">{daten.lieferscheine.map((l) => <Treffer key={l.id} href="/logistik/lieferscheine" titel={l.lieferscheinnummer} text={`${l.versand.auftrag.auftragsnummer} · ${l.versand.auftrag.kunde}`} onClick={() => setOffen(false)} />)}</Gruppe>}
          </div>}
        </div>
      </div>
    </div>}
  </>;
}

function Gruppe({ titel, children }: { titel: string; children: React.ReactNode }) { return <section><h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-[var(--nova-text-schwaecher)]">{titel}</h3><div className="space-y-1">{children}</div></section>; }
function Treffer({ href, titel, text, onClick }: { href: string; titel: string; text: string; onClick: () => void }) { return <Link href={href} onClick={onClick} className="block rounded-xl px-4 py-3 transition hover:bg-[var(--nova-flaeche-hover)]"><strong>{titel}</strong><p className="mt-1 text-sm text-[var(--nova-text-schwaecher)]">{text}</p></Link>; }
