"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import NovaSidebar from "@/components/NovaSidebar";

type Artikel = { id: number; artikelnummer: string; produktname: string; groesse?: string; variante?: string };
type Bestand = { id: number; menge: number; artikel: Artikel };
type Partner = { id: number; nummer: string; name: string; ansprechpartner?: string; email?: string; adresse?: string; bestaende: Bestand[] };
type Sendung = { id: number; sendungsnummer: string; menge: number; status: string; freigegebenVon?: string; versandtAm?: string; rueckmeldeMenge: number; ausschussMenge: number; notiz?: string; konfektionaer: Partner; artikel: Artikel };
type Daten = { konfektionaere: Partner[]; sendungen: Sendung[]; artikel: Artikel[] };

const statusText: Record<string, string> = {
  ZUR_FREIGABE: "Freigabe ausstehend",
  FREIGEGEBEN: "Zum Versand freigegeben",
  BEIM_KONFEKTIONAER: "Beim Konfektionär",
  ABGESCHLOSSEN: "Abgeschlossen",
};

export default function KonfektionaereModul() {
  const [daten, setDaten] = useState<Daten | null>(null);
  const [formular, setFormular] = useState<Record<string, string>>({ menge: "1" });
  const [meldung, setMeldung] = useState("");
  const [fehler, setFehler] = useState("");
  const [laedt, setLaedt] = useState(true);

  const laden = useCallback(async () => {
    setLaedt(true);
    const antwort = await fetch("/api/konfektionaere", { cache: "no-store" });
    const ergebnis = await antwort.json();
    if (antwort.ok) setDaten(ergebnis); else setFehler(ergebnis.fehler ?? "Daten konnten nicht geladen werden.");
    setLaedt(false);
  }, []);

  useEffect(() => void laden(), [laden]);

  async function senden(aktion: string, extra: Record<string, unknown> = {}) {
    setFehler(""); setMeldung("");
    const antwort = await fetch("/api/konfektionaere", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aktion, ...formular, ...extra }),
    });
    const ergebnis = await antwort.json();
    if (!antwort.ok) { setFehler(ergebnis.fehler ?? "Aktion fehlgeschlagen."); return; }
    setMeldung("Vorgang wurde gespeichert.");
    await laden();
  }

  return <main className="min-h-screen bg-[var(--nova-hintergrund)] text-[var(--nova-text)]">
    <NovaSidebar />
    <section className="ml-20 px-8 py-8"><div className="mx-auto max-w-7xl">
      <p className="text-xs font-bold uppercase tracking-[.25em] text-[var(--nova-akzent)]">Konfektion · Fremdfertigung</p>
      <h1 className="mt-2 text-4xl font-bold">Konfektionäre</h1>
      <p className="mt-2 text-[var(--nova-text-schwaecher)]">Partner, Materialfreigaben und Fremdbestände lückenlos steuern.</p>
      {meldung && <Hinweis text={meldung} />}{fehler && <Hinweis text={fehler} fehler />}{laedt && <Hinweis text="Konfektionärsdaten werden geladen …" />}

      {daten && <>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <Kennzahl titel="Aktive Partner" wert={daten.konfektionaere.length} />
          <Kennzahl titel="Freigaben offen" wert={daten.sendungen.filter(s => s.status === "ZUR_FREIGABE").length} />
          <Kennzahl titel="Versandbereit" wert={daten.sendungen.filter(s => s.status === "FREIGEGEBEN").length} />
          <Kennzahl titel="Fremdbestand" wert={daten.konfektionaere.reduce((summe, p) => summe + p.bestaende.reduce((s, b) => s + b.menge, 0), 0).toLocaleString("de-DE")} />
        </div>

        <details className="mt-6 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5">
          <summary className="cursor-pointer text-lg font-bold">Neuen Konfektionär anlegen</summary>
          <form onSubmit={(e) => { e.preventDefault(); void senden("konfektionaer-anlegen"); }} className="mt-5 grid gap-4 md:grid-cols-3">
            <Feld label="Firmenname" wert={formular.name} onChange={v => setFormular(a => ({ ...a, name: v }))} />
            <Feld label="Ansprechpartner" wert={formular.ansprechpartner} onChange={v => setFormular(a => ({ ...a, ansprechpartner: v }))} />
            <Feld label="E-Mail" wert={formular.email} onChange={v => setFormular(a => ({ ...a, email: v }))} />
            <Feld label="Telefon" wert={formular.telefon} onChange={v => setFormular(a => ({ ...a, telefon: v }))} />
            <Feld label="Adresse" wert={formular.adresse} onChange={v => setFormular(a => ({ ...a, adresse: v }))} />
            <button className="self-end rounded-xl bg-[var(--nova-akzent)] px-5 py-3 font-semibold text-white">Partner speichern</button>
          </form>
        </details>

        <form onSubmit={(e: FormEvent) => { e.preventDefault(); void senden("sendung-anlegen"); }} className="mt-6 grid gap-4 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5 md:grid-cols-4">
          <h2 className="md:col-span-4 text-xl font-bold">Material zur Freigabe vorbereiten</h2>
          <Auswahl label="Konfektionär" wert={formular.konfektionaerId} onChange={v => setFormular(a => ({ ...a, konfektionaerId: v }))} optionen={daten.konfektionaere.map(p => [String(p.id), `${p.nummer} · ${p.name}`])} />
          <Auswahl label="Artikel / Material" wert={formular.artikelId} onChange={v => setFormular(a => ({ ...a, artikelId: v }))} optionen={daten.artikel.map(a => [String(a.id), `${a.artikelnummer} · ${a.produktname}`])} />
          <Feld label="Menge" typ="number" wert={formular.menge} onChange={v => setFormular(a => ({ ...a, menge: v }))} />
          <Feld label="Notiz" wert={formular.notiz} onChange={v => setFormular(a => ({ ...a, notiz: v }))} />
          <button className="md:col-span-4 rounded-xl bg-[var(--nova-akzent)] px-5 py-3 font-semibold text-white">Freigabe anfordern</button>
        </form>

        <section className="mt-6 space-y-4"><h2 className="text-xl font-bold">Materialfluss</h2>
          {daten.sendungen.length === 0 && <Hinweis text="Noch keine Materialsendungen vorhanden." />}
          {daten.sendungen.map(s => <SendungsKarte key={s.id} sendung={s} onAktion={senden} />)}
        </section>

        <section className="mt-8"><h2 className="text-xl font-bold">Bestand bei Konfektionären</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{daten.konfektionaere.map(p => <article key={p.id} className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5">
            <b className="text-lg">{p.name}</b><p className="text-sm text-[var(--nova-text-schwaecher)]">{p.nummer} · {p.ansprechpartner ?? "Kein Ansprechpartner"}</p>
            <div className="mt-4 space-y-2">{p.bestaende.length ? p.bestaende.map(b => <div key={b.id} className="flex justify-between rounded-lg bg-[var(--nova-hintergrund)] px-3 py-2 text-sm"><span>{b.artikel.artikelnummer}</span><b>{b.menge.toLocaleString("de-DE")} Stk.</b></div>) : <span className="text-sm text-[var(--nova-text-schwaecher)]">Kein Fremdbestand</span>}</div>
          </article>)}</div>
        </section>
      </>}
    </div></section>
  </main>;
}

function SendungsKarte({ sendung: s, onAktion }: { sendung: Sendung; onAktion: (a: string, e?: Record<string, unknown>) => Promise<void> }) {
  const [fertig, setFertig] = useState(String(s.menge)); const [ausschuss, setAusschuss] = useState("0");
  return <article className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><b>{s.sendungsnummer} · {s.konfektionaer.name}</b><p className="text-sm text-[var(--nova-text-schwaecher)]">{s.artikel.artikelnummer} · {s.artikel.produktname} · {s.menge.toLocaleString("de-DE")} Stk.</p></div><span className="rounded-full bg-[var(--nova-akzent-transparent)] px-3 py-1 text-sm text-[var(--nova-akzent)]">{statusText[s.status] ?? s.status}</span></div>
    <div className="mt-4 flex flex-wrap gap-3">
      {s.status === "ZUR_FREIGABE" && <button onClick={() => void onAktion("sendung-freigeben", { id: s.id })} className="rounded-xl bg-[var(--nova-akzent)] px-4 py-2 font-semibold text-white">Material freigeben</button>}
      {s.status === "FREIGEGEBEN" && <button onClick={() => void onAktion("sendung-versenden", { id: s.id })} className="rounded-xl bg-[var(--nova-akzent)] px-4 py-2 font-semibold text-white">Ausgang bestätigen</button>}
      {s.status === "BEIM_KONFEKTIONAER" && <><input type="number" value={fertig} onChange={e => setFertig(e.target.value)} className="w-32 rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-3 py-2" placeholder="Fertig"/><input type="number" value={ausschuss} onChange={e => setAusschuss(e.target.value)} className="w-32 rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-3 py-2" placeholder="Ausschuss"/><button onClick={() => void onAktion("sendung-rueckmelden", { id: s.id, rueckmeldeMenge: fertig, ausschussMenge: ausschuss })} className="rounded-xl bg-[var(--nova-akzent)] px-4 py-2 font-semibold text-white">Rückmeldung buchen</button></>}
    </div>
  </article>;
}
function Kennzahl({ titel, wert }: { titel: string; wert: string | number }) { return <div className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5"><p className="text-sm text-[var(--nova-text-schwaecher)]">{titel}</p><b className="mt-2 block text-3xl">{wert}</b></div>; }
function Hinweis({ text, fehler = false }: { text: string; fehler?: boolean }) { return <div className={`mt-5 rounded-xl border p-4 ${fehler ? "border-red-500/40 text-red-400" : "border-[var(--nova-rand)] bg-[var(--nova-flaeche)]"}`}>{text}</div>; }
function Feld({ label, wert = "", onChange, typ = "text" }: { label: string; wert?: string; onChange: (v: string) => void; typ?: string }) { return <label className="text-sm"><span className="mb-2 block font-semibold">{label}</span><input required type={typ} value={wert} onChange={e => onChange(e.target.value)} className="w-full rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-4 py-3 outline-none focus:border-[var(--nova-akzent)]" /></label>; }
function Auswahl({ label, wert = "", onChange, optionen }: { label: string; wert?: string; onChange: (v: string) => void; optionen: string[][] }) { return <label className="text-sm"><span className="mb-2 block font-semibold">{label}</span><select required value={wert} onChange={e => onChange(e.target.value)} className="w-full rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-4 py-3"><option value="">Bitte auswählen</option>{optionen.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>; }
