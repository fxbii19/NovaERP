"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import NovaSidebar from "@/components/NovaSidebar";
import { useAuth } from "@/hooks/useAuth";

type Artikel = { id: number; artikelnummer: string; produktname: string; groesse?: string | null; variante?: string | null; verkaufspreis?: number };
type Position = { id: number; menge: number; einzelpreis: number; kommissionierteMenge: number; artikel: Artikel };
type Auftrag = { id: number; auftragsnummer: string; kunde: string; kundenreferenz: string | null; lieferadresse: string | null; notiz: string | null; erstelltAm: string; erstelltVon: string | null; status: string; prioritaet: string; liefertermin: string | null; positionen: Position[]; kommissionierung: Kommissionierung | null };
type Kommissionierung = { id: number; kommissioniernummer: string; status: string; bearbeiter: string | null; auftrag: Auftrag };
type Ladung = { id: number; ladungsnummer: string; status: string; spediteur: string | null; kennzeichen: string | null; rampe: string | null; ziel: string | null; abfahrt: string | null; auftraege: { id: number; auftrag: Auftrag }[] };
type Sendung = { id: number; versandnummer: string; status: string; versandart: string | null; trackingnummer: string | null; warenwert: number; bezahlt: boolean; bezahltAm: string | null; auftrag: Auftrag; ladung: Ladung | null; desadv: Desadv | null; lieferschein: Lieferschein | null };
type Desadv = { id: number; desadvnummer: string; status: string; empfaenger: string | null; gesendetVon: string | null; versand: { auftrag: Auftrag; ladung: Ladung | null } };
type Lieferschein = { id: number; lieferscheinnummer: string; status: string; erstelltAm: string; versand: { auftrag: Auftrag } };
type Daten = { auftraege: Auftrag[]; kommissionierungen: Kommissionierung[]; ladungen: Ladung[]; sendungen: Sendung[]; desadv: Desadv[]; lieferscheine: Lieferschein[] };
export type LogistikModus = "uebersicht" | "auftraege" | "kommissionierung" | "ladungen" | "versand" | "desadv" | "lieferscheine";

const TITEL: Record<LogistikModus, [string, string]> = {
  uebersicht: ["Logistik", "Vom Kundenauftrag bis zur Versandmeldung"],
  auftraege: ["Aufträge", "Kundenaufträge und Positionen verwalten"],
  kommissionierung: ["Kommissionierung", "Aufträge bereitstellen und vollständig kommissionieren"],
  ladungen: ["Ladungen", "Transporte planen und kommissionierte Aufträge zuordnen"],
  versand: ["Versand", "Sendungen vorbereiten und den Versand bestätigen"],
  desadv: ["DESADV", "Elektronische Lieferavise erstellen und versenden"],
  lieferscheine: ["Lieferscheine", "Automatisch erzeugte Lieferdokumente anzeigen"],
};

export default function LogistikModul({ modus }: { modus: LogistikModus }) {
  const { user } = useAuth();
  const [daten, setDaten] = useState<Daten | null>(null);
  const [artikel, setArtikel] = useState<Artikel[]>([]);
  const [formular, setFormular] = useState<Record<string, string>>({ prioritaet: "NORMAL", menge: "1" });
  const [fehler, setFehler] = useState<string | null>(null);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(true);

  const laden = useCallback(async () => {
    try {
      setLaedt(true);
      const [l, a] = await Promise.all([fetch("/api/logistik", { cache: "no-store" }), fetch("/api/artikel", { cache: "no-store" })]);
      const [ld, ad] = await Promise.all([l.json(), a.json()]);
      if (!l.ok) throw new Error(ld.fehler);
      setDaten(ld); setArtikel(Array.isArray(ad) ? ad : []);
    } catch (error) { setFehler(error instanceof Error ? error.message : "Logistikdaten konnten nicht geladen werden."); }
    finally { setLaedt(false); }
  }, []);

  useEffect(() => void laden(), [laden]);

  async function senden(aktion: string, extra: Record<string, unknown> = {}) {
    setFehler(null); setMeldung(null);
    const antwort = await fetch("/api/logistik", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aktion, ...formular, ...extra }) });
    const ergebnis = await antwort.json();
    if (!antwort.ok) { setFehler(ergebnis.fehler ?? "Aktion fehlgeschlagen."); return false; }
    setMeldung("Vorgang wurde erfolgreich gespeichert."); setFormular({ prioritaet: "NORMAL", menge: "1" }); await laden(); return true;
  }

  const [titel, untertitel] = TITEL[modus];
  const kommissionierbare = daten?.auftraege.filter((a) => ["OFFEN", "KOMMISSIONIERUNG"].includes(a.status)) ?? [];
  const ladbare = daten?.auftraege.filter((a) => a.status === "KOMMISSIONIERT") ?? [];

  return <main className="min-h-screen bg-[var(--nova-hintergrund)] text-[var(--nova-text)]"><NovaSidebar /><section className="ml-20 px-8 py-8"><div className="mx-auto max-w-7xl"><h1 className="text-4xl font-bold">{titel}</h1><p className="mt-2 text-[var(--nova-text-schwaecher)]">{untertitel}</p>{meldung && <Hinweis gruen>{meldung}</Hinweis>}{fehler && <Hinweis rot>{fehler}</Hinweis>}{laedt && <Hinweis>Daten werden geladen...</Hinweis>}

  {!laedt && daten && modus === "uebersicht" && <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4"><Karte titel="Offene Aufträge" wert={daten.auftraege.filter((a) => a.status !== "VERSENDET").length} /><Karte titel="Kommissionierbereit" wert={kommissionierbare.length} /><Karte titel="Geplante Ladungen" wert={daten.ladungen.filter((l) => l.status === "GEPLANT").length} /><Karte titel="Offene DESADV" wert={daten.desadv.filter((d) => d.status !== "GESENDET").length} /></div>}

  {!laedt && daten && modus === "auftraege" && <><form onSubmit={(e) => { e.preventDefault(); void senden("auftrag-anlegen"); }} className="mt-8 grid gap-4 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5 md:grid-cols-3"><Feld label="Kunde" wert={formular.kunde ?? ""} onChange={(v) => setFormular((a) => ({ ...a, kunde: v }))} /><Feld label="Kundenreferenz" erforderlich={false} wert={formular.kundenreferenz ?? ""} onChange={(v) => setFormular((a) => ({ ...a, kundenreferenz: v }))} /><Feld label="Lieferadresse" erforderlich={false} wert={formular.lieferadresse ?? ""} onChange={(v) => setFormular((a) => ({ ...a, lieferadresse: v }))} /><Auswahl label="Artikel" wert={formular.artikelId ?? ""} onChange={(v) => setFormular((a) => ({ ...a, artikelId: v }))} optionen={artikel.map((a) => [String(a.id), `${a.artikelnummer} · ${a.produktname}`])} /><Feld label="Menge" typ="number" wert={formular.menge ?? "1"} onChange={(v) => setFormular((a) => ({ ...a, menge: v }))} /><Auswahl label="Priorität" wert={formular.prioritaet ?? "NORMAL"} onChange={(v) => setFormular((a) => ({ ...a, prioritaet: v }))} optionen={[["NORMAL", "Normal"], ["HOCH", "Hoch"], ["EXPRESS", "Express"]]} /><Feld label="Liefertermin" typ="date" erforderlich={false} wert={formular.liefertermin ?? ""} onChange={(v) => setFormular((a) => ({ ...a, liefertermin: v }))} /><div className="md:col-span-2 self-end"><Primaer text="Auftrag anlegen" /></div></form><AuftragsTabelle auftraege={daten.auftraege} /></>}

  {!laedt && daten && modus === "kommissionierung" && <div className="mt-8 space-y-4">{kommissionierbare.length === 0 && <Leer text="Keine Aufträge zur Kommissionierung vorhanden." />}{kommissionierbare.map((a) => <div key={a.id} className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><b>{a.auftragsnummer} · {a.kunde}</b><p className="text-sm text-[var(--nova-text-schwaecher)]">{a.positionen.map((p) => `${p.artikel.artikelnummer}: ${zahl(p.menge)}`).join(" · ")}</p></div>{a.status === "OFFEN" ? <button onClick={() => void senden("kommissionierung-starten", { auftragId: a.id })} className="rounded-xl bg-[var(--nova-akzent)] px-4 py-3 text-white">Kommissionierung starten</button> : <button onClick={() => void senden("kommissionierung-abschliessen", { auftragId: a.id })} className="rounded-xl bg-emerald-600 px-4 py-3 text-white">Vollständig kommissioniert</button>}</div></div>)}</div>}

  {!laedt && daten && modus === "ladungen" && <><form onSubmit={(e) => { e.preventDefault(); void senden("ladung-anlegen"); }} className="mt-8 grid gap-4 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5 md:grid-cols-3"><Feld label="Spediteur" wert={formular.spediteur ?? ""} onChange={(v) => setFormular((a) => ({ ...a, spediteur: v }))} /><Feld label="Kennzeichen" erforderlich={false} wert={formular.kennzeichen ?? ""} onChange={(v) => setFormular((a) => ({ ...a, kennzeichen: v }))} /><Feld label="Rampe" erforderlich={false} wert={formular.rampe ?? ""} onChange={(v) => setFormular((a) => ({ ...a, rampe: v }))} /><Feld label="Ziel" wert={formular.ziel ?? ""} onChange={(v) => setFormular((a) => ({ ...a, ziel: v }))} /><Feld label="Abfahrt" typ="datetime-local" erforderlich={false} wert={formular.abfahrt ?? ""} onChange={(v) => setFormular((a) => ({ ...a, abfahrt: v }))} /><div className="self-end"><Primaer text="Ladung planen" /></div></form><Zuordnung daten={daten} auftraege={ladbare} senden={senden} /></>}

  {!laedt && daten && modus === "versand" && <VersandBereich daten={daten} formular={formular} setFormular={setFormular} senden={senden} darfZahlung={user?.rolle === "ADMIN" || user?.abteilung.toLocaleLowerCase("de-DE") === "versandbüro"} />}
  {!laedt && daten && modus === "desadv" && <div className="mt-8 space-y-4">{daten.desadv.map((d) => <div key={d.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5"><div><b>{d.desadvnummer}</b><p className="text-sm text-[var(--nova-text-schwaecher)]">{d.versand.auftrag.auftragsnummer} · {d.versand.auftrag.kunde} · {d.status}</p></div>{d.status !== "GESENDET" && <button onClick={() => void senden("desadv-senden", { id: d.id })} className="rounded-xl bg-[var(--nova-akzent)] px-4 py-3 text-white">DESADV senden</button>}</div>)}</div>}
  {!laedt && daten && modus === "lieferscheine" && <div className="mt-8 overflow-auto rounded-2xl border border-[var(--nova-rand)]"><table className="w-full text-sm"><thead className="bg-[var(--nova-flaeche)]"><tr>{["Lieferschein", "Auftrag", "Kunde", "Positionen", "Status", "Erstellt"].map((t) => <th key={t} className="px-4 py-3 text-left">{t}</th>)}</tr></thead><tbody>{daten.lieferscheine.map((l) => <tr key={l.id} className="border-t border-[var(--nova-rand)]"><td className="px-4 py-3 text-[var(--nova-akzent)]">{l.lieferscheinnummer}</td><td className="px-4 py-3">{l.versand.auftrag.auftragsnummer}</td><td className="px-4 py-3">{l.versand.auftrag.kunde}</td><td className="px-4 py-3">{l.versand.auftrag.positionen.length}</td><td className="px-4 py-3">{l.status}</td><td className="px-4 py-3">{new Date(l.erstelltAm).toLocaleDateString("de-DE")}</td></tr>)}</tbody></table></div>}
  </div></section></main>;
}

function Zuordnung({ daten, auftraege, senden }: { daten: Daten; auftraege: Auftrag[]; senden: (a: string, e?: Record<string, unknown>) => Promise<boolean> }) { const [ladungId, setLadungId] = useState(""); const [auftragId, setAuftragId] = useState(""); return <><div className="mt-5 grid gap-4 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5 md:grid-cols-3 md:items-end"><Auswahl label="Ladung" wert={ladungId} onChange={setLadungId} optionen={daten.ladungen.map((l) => [String(l.id), `${l.ladungsnummer} · ${l.ziel ?? "ohne Ziel"}`])} /><Auswahl label="Kommissionierter Auftrag" wert={auftragId} onChange={setAuftragId} optionen={auftraege.map((a) => [String(a.id), `${a.auftragsnummer} · ${a.kunde}`])} /><button onClick={() => void senden("ladung-zuordnen", { ladungId, auftragId })} className="rounded-xl bg-[var(--nova-akzent)] px-4 py-3 text-white">Zur Ladung hinzufügen</button></div><div className="mt-6 grid gap-5 md:grid-cols-2">{daten.ladungen.map((l) => <div key={l.id} className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5"><b>{l.ladungsnummer} · {l.ziel ?? "Ohne Ziel"}</b><p className="text-sm text-[var(--nova-text-schwaecher)]">{l.spediteur ?? "Spediteur offen"} · {l.status}</p><div className="mt-3 text-sm">{l.auftraege.map((a) => <p key={a.id}>{a.auftrag.auftragsnummer} · {a.auftrag.kunde}</p>)}</div></div>)}</div></>; }
function VersandBereich({ daten, formular, setFormular, senden, darfZahlung }: { daten: Daten; formular: Record<string, string>; setFormular: React.Dispatch<React.SetStateAction<Record<string, string>>>; senden: (a: string, e?: Record<string, unknown>) => Promise<boolean>; darfZahlung: boolean }) { const bereit = daten.auftraege.filter((a) => ["KOMMISSIONIERT", "VERLADUNG"].includes(a.status) && !daten.sendungen.some((s) => s.auftrag.id === a.id)); return <><form onSubmit={(e) => { e.preventDefault(); void senden("versand-vorbereiten"); }} className="mt-8 grid gap-4 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5 md:grid-cols-3"><Auswahl label="Auftrag" wert={formular.auftragId ?? ""} onChange={(v) => setFormular((a) => ({ ...a, auftragId: v }))} optionen={bereit.map((a) => [String(a.id), `${a.auftragsnummer} · ${a.kunde}`])} /><Auswahl label="Ladung" erforderlich={false} wert={formular.ladungId ?? ""} onChange={(v) => setFormular((a) => ({ ...a, ladungId: v }))} optionen={daten.ladungen.map((l) => [String(l.id), l.ladungsnummer])} /><Feld label="Versandart" wert={formular.versandart ?? "Spedition"} onChange={(v) => setFormular((a) => ({ ...a, versandart: v }))} /><Feld label="Trackingnummer" erforderlich={false} wert={formular.trackingnummer ?? ""} onChange={(v) => setFormular((a) => ({ ...a, trackingnummer: v }))} /><Feld label="DESADV-Empfänger" erforderlich={false} wert={formular.empfaenger ?? ""} onChange={(v) => setFormular((a) => ({ ...a, empfaenger: v }))} /><div className="self-end"><Primaer text="Versand vorbereiten" /></div></form><div className="mt-6 space-y-4">{daten.sendungen.map((s) => <div key={s.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5"><div><b>{s.versandnummer} · {s.auftrag.auftragsnummer}</b><p className="text-sm text-[var(--nova-text-schwaecher)]">{s.auftrag.kunde} · {s.versandart} · {s.status}</p><p className="mt-1 text-sm font-semibold">{s.warenwert.toLocaleString("de-DE", { style: "currency", currency: "EUR" })} · {s.bezahlt ? "Bezahlt" : "Zahlung offen"}</p></div><div className="flex gap-3">{s.status !== "VERSENDET" && <button onClick={() => void senden("versand-bestaetigen", { id: s.id })} className="rounded-xl bg-emerald-600 px-4 py-3 text-white">Versand bestätigen</button>}{s.status === "VERSENDET" && !s.bezahlt && darfZahlung && <button onClick={() => void senden("zahlung-bestaetigen", { id: s.id })} className="rounded-xl bg-cyan-600 px-4 py-3 text-white">Zahlung bestätigen</button>}</div></div>)}</div></>; }
function AuftragsTabelle({ auftraege }: { auftraege: Auftrag[] }) {
  const [ausgewaehlt, setAusgewaehlt] = useState<Auftrag | null>(null);

  return <>
    <div className="mt-6 overflow-auto rounded-2xl border border-[var(--nova-rand)]">
      <table className="w-full text-sm">
        <thead className="bg-[var(--nova-flaeche)]"><tr>{["Auftrag", "Kunde", "Positionen", "Priorität", "Liefertermin", "Status"].map((t) => <th key={t} className="px-4 py-3 text-left">{t}</th>)}</tr></thead>
        <tbody>{auftraege.map((a) => <tr key={a.id} onClick={() => setAusgewaehlt(a)} className="cursor-pointer border-t border-[var(--nova-rand)] transition hover:bg-[var(--nova-flaeche-hover)]" title="Auftrag und Materiallieferschein öffnen"><td className="px-4 py-3 font-medium text-[var(--nova-akzent)]">{a.auftragsnummer}</td><td className="px-4 py-3">{a.kunde}</td><td className="px-4 py-3">{a.positionen.length}</td><td className="px-4 py-3">{a.prioritaet}</td><td className="px-4 py-3">{a.liefertermin ? new Date(a.liefertermin).toLocaleDateString("de-DE") : "–"}</td><td className="px-4 py-3">{a.status}</td></tr>)}</tbody>
      </table>
    </div>
    {ausgewaehlt && <Materiallieferschein auftrag={ausgewaehlt} onSchliessen={() => setAusgewaehlt(null)} />}
  </>;
}

function Materiallieferschein({ auftrag, onSchliessen }: { auftrag: Auftrag; onSchliessen: () => void }) {
  const gesamt = auftrag.positionen.reduce((summe, position) => summe + position.menge * (position.einzelpreis || position.artikel.verkaufspreis || 0), 0);
  const waehrung = (wert: number) => wert.toLocaleString("de-DE", { style: "currency", currency: "EUR" });

  return <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/75 p-5 backdrop-blur-sm">
    <style jsx global>{`@media print { body * { visibility: hidden !important; } .materiallieferschein-druck, .materiallieferschein-druck * { visibility: visible !important; } .materiallieferschein-druck { position: absolute !important; inset: 0 !important; width: 100% !important; max-width: none !important; border: 0 !important; box-shadow: none !important; background: white !important; color: black !important; } .nicht-drucken { display: none !important; } }`}</style>
    <article className="materiallieferschein-druck mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] shadow-2xl">
      <header className="flex flex-wrap items-start justify-between gap-5 border-b border-[var(--nova-rand)] p-7">
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--nova-akzent)]">NOVA ERP · Logistik</p><h2 className="mt-2 text-3xl font-bold">Materiallieferschein</h2><p className="mt-1 text-[var(--nova-text-schwaecher)]">Auftrag {auftrag.auftragsnummer}</p></div>
        <div className="nicht-drucken flex gap-3"><button type="button" onClick={() => window.print()} className="rounded-xl bg-[var(--nova-akzent)] px-5 py-3 font-semibold text-white">Drucken / als PDF speichern</button><button type="button" onClick={onSchliessen} className="rounded-xl border border-[var(--nova-rand)] px-5 py-3">Schließen</button></div>
      </header>
      <div className="grid gap-6 border-b border-[var(--nova-rand)] p-7 md:grid-cols-2">
        <section><p className="text-xs font-semibold uppercase text-[var(--nova-text-schwaecher)]">Empfänger</p><h3 className="mt-2 text-lg font-bold">{auftrag.kunde}</h3><p className="mt-1 whitespace-pre-line">{auftrag.lieferadresse || "Keine Lieferadresse hinterlegt"}</p>{auftrag.kundenreferenz && <p className="mt-3 text-sm">Kundenreferenz: <b>{auftrag.kundenreferenz}</b></p>}</section>
        <section className="grid grid-cols-2 gap-4 text-sm"><Info titel="Auftragsdatum" wert={new Date(auftrag.erstelltAm).toLocaleDateString("de-DE")} /><Info titel="Liefertermin" wert={auftrag.liefertermin ? new Date(auftrag.liefertermin).toLocaleDateString("de-DE") : "Offen"} /><Info titel="Priorität" wert={auftrag.prioritaet} /><Info titel="Status" wert={auftrag.status} /></section>
      </div>
      <div className="overflow-x-auto p-7">
        <table className="w-full border-collapse text-sm"><thead><tr className="border-b-2 border-[var(--nova-rand)] text-left"><th className="py-3 pr-3">Pos.</th><th className="py-3 pr-3">Artikel</th><th className="py-3 pr-3">Größe / Variante</th><th className="py-3 pr-3 text-right">Menge</th><th className="py-3 pr-3 text-right">Einzelpreis</th><th className="py-3 text-right">Gesamt</th></tr></thead><tbody>{auftrag.positionen.map((position, index) => { const preis = position.einzelpreis || position.artikel.verkaufspreis || 0; return <tr key={position.id} className="border-b border-[var(--nova-rand)]"><td className="py-4 pr-3">{index + 1}</td><td className="py-4 pr-3"><b>{position.artikel.artikelnummer}</b><p className="text-[var(--nova-text-schwaecher)]">{position.artikel.produktname}</p></td><td className="py-4 pr-3">{position.artikel.groesse || "–"} / {position.artikel.variante || "–"}</td><td className="py-4 pr-3 text-right">{zahl(position.menge)} Stk.</td><td className="py-4 pr-3 text-right">{waehrung(preis)}</td><td className="py-4 text-right font-semibold">{waehrung(position.menge * preis)}</td></tr>; })}</tbody><tfoot><tr><td colSpan={5} className="pt-5 text-right text-lg font-bold">Materialwert</td><td className="pt-5 text-right text-lg font-bold text-[var(--nova-akzent)]">{waehrung(gesamt)}</td></tr></tfoot></table>
      </div>
      <footer className="grid gap-8 border-t border-[var(--nova-rand)] p-7 text-sm md:grid-cols-2"><div><p className="text-[var(--nova-text-schwaecher)]">Hinweis</p><p className="mt-2">{auftrag.notiz || "Material vollständig und unbeschädigt übernommen."}</p></div><div className="grid grid-cols-2 gap-6 pt-8"><div className="border-t border-current pt-2">Datum / Unterschrift Ausgabe</div><div className="border-t border-current pt-2">Datum / Unterschrift Empfänger</div></div></footer>
    </article>
  </div>;
}

function Info({ titel, wert }: { titel: string; wert: string }) { return <div><p className="text-[var(--nova-text-schwaecher)]">{titel}</p><b className="mt-1 block">{wert}</b></div>; }
function Feld({ label, wert, onChange, typ = "text", erforderlich = true }: { label: string; wert: string; onChange: (v: string) => void; typ?: string; erforderlich?: boolean }) { return <label className="block text-sm"><span className="mb-2 block font-medium">{label}</span><input required={erforderlich} type={typ} step="any" value={wert} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-4 py-3 outline-none focus:border-[var(--nova-akzent)]" /></label>; }
function Auswahl({ label, wert, onChange, optionen, erforderlich = true }: { label: string; wert: string; onChange: (v: string) => void; optionen: string[][]; erforderlich?: boolean }) { return <label className="block text-sm"><span className="mb-2 block font-medium">{label}</span><select required={erforderlich} value={wert} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-4 py-3"><option value="">Bitte auswählen</option>{optionen.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>; }
function Primaer({ text }: { text: string }) { return <button type="submit" className="w-full rounded-xl bg-[var(--nova-akzent)] px-5 py-3 font-semibold text-white">{text}</button>; }
function Karte({ titel, wert }: { titel: string; wert: number }) { return <div className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-6"><p className="text-sm text-[var(--nova-text-schwaecher)]">{titel}</p><p className="mt-3 text-3xl font-bold">{wert}</p></div>; }
function Hinweis({ children, gruen, rot }: { children: React.ReactNode; gruen?: boolean; rot?: boolean }) { return <div className={`mt-6 rounded-xl border p-4 text-sm ${gruen ? "border-emerald-800 bg-emerald-950/40 text-emerald-300" : rot ? "border-red-900 bg-red-950/50 text-red-300" : "border-[var(--nova-rand)] bg-[var(--nova-flaeche)]"}`}>{children}</div>; }
function Leer({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-[var(--nova-rand)] p-12 text-center text-[var(--nova-text-schwaecher)]">{text}</div>; }
function zahl(w: number) { return Number(w).toLocaleString("de-DE", { maximumFractionDigits: 2 }); }
