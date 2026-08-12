"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import NovaSidebar from "@/components/NovaSidebar";
import { useAuth } from "@/hooks/useAuth";

type Artikel = { id: number; artikelnummer: string; produktname: string };
type Lagerplatz = { id: number; code: string; bezeichnung: string };
type Pruefung = { id: number; ergebnis: string; gutMenge: number; fehlerMenge: number; fehlerart: string | null; schweregrad: string | null; geprueftVon: string | null; freigaben: { id: number; entscheidung: string }[] };
type Pruefauftrag = { id: number; pruefnummer: string; typ: string; status: string; prioritaet: string; pruefmenge: number; zugewiesenAn: string | null; artikel: Artikel; lagerplatz: Lagerplatz | null; pruefung: Pruefung | null };
type Freigabe = { id: number; entscheidung: string; begruendung: string | null; entschiedenVon: string | null; entschiedenAm: string; pruefung: { pruefauftrag: { pruefnummer: string; artikel: Artikel } } };
type Sperrbestand = { id: number; menge: number; grund: string; status: string; gesperrtVon: string | null; artikel: Artikel; lagerplatz: Lagerplatz | null };
type Konfektion = { id: number; auftragsnummer: string; status: string; arbeitsschritt: string; sollMenge: number; istMenge: number; ausschussMenge: number; bearbeiter: string | null; artikel: Artikel; vonLagerplatz: Lagerplatz | null; nachLagerplatz: Lagerplatz | null };
type QmDaten = { pruefauftraege: Pruefauftrag[]; freigaben: Freigabe[]; sperrbestaende: Sperrbestand[]; konfektionsauftraege: Konfektion[] };
export type QmModus = "uebersicht" | "pruefungen" | "pruefauftraege" | "freigaben" | "sperrbestand" | "konfektion";

const TITEL: Record<QmModus, [string, string]> = {
  uebersicht: ["Konfektion", "Prüfungen, Freigaben und gesperrte Bestände im Überblick"],
  pruefungen: ["Qualitätsprüfung", "Offene Prüfaufträge bearbeiten und Ergebnisse dokumentieren"],
  pruefauftraege: ["Prüfaufträge", "Neue Prüfungen planen und deren Status verfolgen"],
  freigaben: ["Freigaben", "Abweichungen freigeben, sperren oder zur Nacharbeit geben"],
  sperrbestand: ["Sperrbestand", "Gesperrte Mengen und deren Gründe transparent anzeigen"],
  konfektion: ["Konfektionsaufträge", "Arbeitsschritte mit Soll-, Ist- und Ausschussmenge steuern"],
};

export default function QualitaetsModul({ modus }: { modus: QmModus }) {
  const { user } = useAuth();
  const [daten, setDaten] = useState<QmDaten | null>(null);
  const [artikel, setArtikel] = useState<Artikel[]>([]);
  const [lagerplaetze, setLagerplaetze] = useState<Lagerplatz[]>([]);
  const [formular, setFormular] = useState<Record<string, string>>({ typ: "EINGANGSPRUEFUNG", prioritaet: "NORMAL" });
  const [fehler, setFehler] = useState<string | null>(null);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(true);

  const laden = useCallback(async () => {
    try {
      setLaedt(true);
      const [q, a, l] = await Promise.all([fetch("/api/qualitaet", { cache: "no-store" }), fetch("/api/artikel", { cache: "no-store" }), fetch("/api/lager", { cache: "no-store" })]);
      const [qd, ad, ld] = await Promise.all([q.json(), a.json(), l.json()]);
      if (!q.ok) throw new Error(qd.fehler);
      setDaten(qd);
      setArtikel(Array.isArray(ad) ? ad : []);
      setLagerplaetze(Array.isArray(ld.lagerplaetze) ? ld.lagerplaetze : []);
    } catch (error) {
      setFehler(error instanceof Error ? error.message : "Qualitätsdaten konnten nicht geladen werden.");
    } finally { setLaedt(false); }
  }, []);

  useEffect(() => void laden(), [laden]);

  async function senden(aktion: string, extra: Record<string, unknown> = {}) {
    setFehler(null); setMeldung(null);
    const antwort = await fetch("/api/qualitaet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aktion, ...formular, ...extra }) });
    const ergebnis = await antwort.json();
    if (!antwort.ok) { setFehler(ergebnis.fehler ?? "Aktion fehlgeschlagen."); return false; }
    setMeldung("Vorgang wurde erfolgreich gespeichert.");
    setFormular({ typ: "EINGANGSPRUEFUNG", prioritaet: "NORMAL" });
    await laden(); return true;
  }

  const [titel, untertitel] = TITEL[modus];
  const offenePruefungen = daten?.pruefauftraege.filter((p) => p.status === "OFFEN") ?? [];
  const offeneFreigaben = daten?.pruefauftraege.filter((p) => p.status === "FREIGABE_OFFEN") ?? [];

  return <main className="min-h-screen bg-[var(--nova-hintergrund)] text-[var(--nova-text)]"><NovaSidebar /><section className="ml-20 px-8 py-8"><div className="mx-auto max-w-7xl"><h1 className="text-4xl font-bold">{titel}</h1><p className="mt-2 text-[var(--nova-text-schwaecher)]">{untertitel}</p>{meldung && <Hinweis gruen>{meldung}</Hinweis>}{fehler && <Hinweis rot>{fehler}</Hinweis>}{laedt && <Hinweis>Daten werden geladen...</Hinweis>}

  {!laedt && daten && modus === "uebersicht" && <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4"><Karte titel="Offene Prüfaufträge" wert={offenePruefungen.length} /><Karte titel="Offene Freigaben" wert={offeneFreigaben.length} /><Karte titel="Gesperrte Positionen" wert={daten.sperrbestaende.filter((s) => s.status === "GESPERRT").length} /><Karte titel="Offene Konfektion" wert={daten.konfektionsauftraege.filter((k) => k.status !== "ABGESCHLOSSEN").length} /></div>}

  {!laedt && daten && modus === "pruefauftraege" && <><form onSubmit={(e) => { e.preventDefault(); void senden("pruefauftrag-anlegen"); }} className="mt-8 grid gap-4 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5 md:grid-cols-3"><Auswahl label="Artikel" wert={formular.artikelId ?? ""} onChange={(v) => setFormular((a) => ({ ...a, artikelId: v }))} optionen={artikel.map((a) => [String(a.id), `${a.artikelnummer} · ${a.produktname}`])} /><Auswahl label="Lagerplatz" erforderlich={false} wert={formular.lagerplatzId ?? ""} onChange={(v) => setFormular((a) => ({ ...a, lagerplatzId: v }))} optionen={lagerplaetze.map((l) => [String(l.id), `${l.code} · ${l.bezeichnung}`])} /><Auswahl label="Prüfart" wert={formular.typ ?? ""} onChange={(v) => setFormular((a) => ({ ...a, typ: v }))} optionen={[["EINGANGSPRUEFUNG", "Eingangsprüfung"], ["ZWISCHENPRUEFUNG", "Zwischenprüfung"], ["ENDPRUEFUNG", "Endprüfung"]]} /><Feld label="Prüfmenge" typ="number" wert={formular.pruefmenge ?? ""} onChange={(v) => setFormular((a) => ({ ...a, pruefmenge: v }))} /><Auswahl label="Priorität" wert={formular.prioritaet ?? "NORMAL"} onChange={(v) => setFormular((a) => ({ ...a, prioritaet: v }))} optionen={[["NIEDRIG", "Niedrig"], ["NORMAL", "Normal"], ["HOCH", "Hoch"], ["DRINGEND", "Dringend"]]} /><Feld label="Zuweisen an" erforderlich={false} wert={formular.zugewiesenAn ?? ""} onChange={(v) => setFormular((a) => ({ ...a, zugewiesenAn: v }))} /><div className="md:col-span-3"><Primaer text="Prüfauftrag anlegen" /></div></form><AuftragsTabelle auftraege={daten.pruefauftraege} /></>}

  {!laedt && daten && modus === "pruefungen" && <div className="mt-8 space-y-5">{offenePruefungen.length === 0 && <Leer text="Keine offenen Prüfaufträge." />}{offenePruefungen.map((auftrag) => <PruefFormular key={auftrag.id} auftrag={auftrag} onSenden={(werte) => senden("pruefung-abschliessen", { pruefauftragId: auftrag.id, ...werte })} />)}</div>}

  {!laedt && daten && modus === "freigaben" && <div className="mt-8 space-y-5">{offeneFreigaben.length === 0 && <Leer text="Keine offenen Freigabeentscheidungen." />}{offeneFreigaben.map((auftrag) => <FreigabeKarte key={auftrag.id} auftrag={auftrag} onEntscheiden={(entscheidung, begruendung) => senden("freigabe-entscheiden", { pruefungId: auftrag.pruefung?.id, entscheidung, begruendung })} />)}{daten.freigaben.length > 0 && <><h2 className="pt-6 text-xl font-semibold">Entscheidungsverlauf</h2>{daten.freigaben.map((f) => <div key={f.id} className="rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-4 text-sm"><b>{f.pruefung.pruefauftrag.pruefnummer}</b> · {f.pruefung.pruefauftrag.artikel.artikelnummer} · <span className="text-[var(--nova-akzent)]">{f.entscheidung}</span> · {f.entschiedenVon ?? "–"}</div>)}</> }</div>}

  {!laedt && daten && modus === "sperrbestand" && <SperrTabelle positionen={daten.sperrbestaende} onFreigeben={(id) => void senden("sperrbestand-freigeben", { id })} />}

  {!laedt && daten && modus === "konfektion" && <KonfektionBereich auftraege={daten.konfektionsauftraege} artikel={artikel} lagerplaetze={lagerplaetze} formular={formular} setFormular={setFormular} onAnlegen={(e) => { e.preventDefault(); void senden("konfektion-anlegen"); }} onAbschliessen={(id, istMenge, ausschussMenge) => void senden("konfektion-abschliessen", { id, istMenge, ausschussMenge })} />}
  </div></section></main>;
}

function PruefFormular({ auftrag, onSenden }: { auftrag: Pruefauftrag; onSenden: (werte: Record<string, string>) => Promise<boolean> }) {
  const [w, setW] = useState<Record<string, string>>({ gutMenge: String(auftrag.pruefmenge), fehlerMenge: "0", schweregrad: "MITTEL" });
  const mengeAendern = (feld: "gutMenge" | "fehlerMenge", wert: string) => {
    const menge = Number(wert);
    const gegenfeld = feld === "gutMenge" ? "fehlerMenge" : "gutMenge";
    setW((aktuell) => ({
      ...aktuell,
      [feld]: wert,
      ...(Number.isFinite(menge) && menge >= 0 && menge <= auftrag.pruefmenge
        ? { [gegenfeld]: String(auftrag.pruefmenge - menge) }
        : {}),
    }));
  };
  return <form onSubmit={(e) => { e.preventDefault(); void onSenden(w); }} className="grid gap-4 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5 md:grid-cols-3"><div className="md:col-span-3"><b>{auftrag.pruefnummer} · {auftrag.artikel.artikelnummer}</b><p className="text-sm text-[var(--nova-text-schwaecher)]">{auftrag.typ} · Prüfmenge {zahl(auftrag.pruefmenge)} · {auftrag.lagerplatz?.code ?? "ohne Lagerplatz"}</p></div><Feld label="Gut-Menge" typ="number" wert={w.gutMenge} onChange={(v) => mengeAendern("gutMenge", v)} /><Feld label="Fehlermenge" typ="number" wert={w.fehlerMenge} onChange={(v) => mengeAendern("fehlerMenge", v)} /><Auswahl label="Schweregrad" wert={w.schweregrad} onChange={(v) => setW((a) => ({ ...a, schweregrad: v }))} optionen={[["LEICHT", "Leicht"], ["MITTEL", "Mittel"], ["KRITISCH", "Kritisch"]]} /><Feld label="Fehlerart" erforderlich={false} wert={w.fehlerart ?? ""} onChange={(v) => setW((a) => ({ ...a, fehlerart: v }))} /><Feld label="Bemerkung" erforderlich={false} wert={w.bemerkung ?? ""} onChange={(v) => setW((a) => ({ ...a, bemerkung: v }))} /><div className="self-end"><Primaer text="Prüfung abschließen" /></div></form>;
}
function FreigabeKarte({ auftrag, onEntscheiden }: { auftrag: Pruefauftrag; onEntscheiden: (e: string, b: string) => Promise<boolean> }) { const [b, setB] = useState(""); return <div className="rounded-2xl border border-amber-700/50 bg-[var(--nova-flaeche)] p-5"><b>{auftrag.pruefnummer} · {auftrag.artikel.artikelnummer}</b><p className="mt-1 text-sm text-[var(--nova-text-schwaecher)]">Fehlermenge {zahl(auftrag.pruefung?.fehlerMenge ?? 0)} · {auftrag.pruefung?.fehlerart ?? "Abweichung"} · {auftrag.pruefung?.schweregrad}</p><div className="mt-4 flex flex-wrap gap-3"><input value={b} onChange={(e) => setB(e.target.value)} placeholder="Begründung / Entscheidung..." className="min-w-64 flex-1 rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-4 py-3 outline-none" />{[["FREIGEGEBEN", "Freigeben"], ["NACHARBEIT", "Nacharbeit"], ["GESPERRT", "Sperren"]].map(([v, t]) => <button key={v} onClick={() => void onEntscheiden(v, b)} className="rounded-xl bg-[var(--nova-akzent)] px-4 py-3 text-sm font-semibold text-white">{t}</button>)}</div></div>; }
function AuftragsTabelle({ auftraege }: { auftraege: Pruefauftrag[] }) { return <div className="mt-6 overflow-auto rounded-2xl border border-[var(--nova-rand)]"><table className="w-full text-sm"><thead className="bg-[var(--nova-flaeche)]"><tr>{["Prüfnummer", "Artikel", "Art", "Menge", "Priorität", "Status"].map((t) => <th key={t} className="px-4 py-3 text-left">{t}</th>)}</tr></thead><tbody>{auftraege.map((a) => <tr key={a.id} className="border-t border-[var(--nova-rand)]"><td className="px-4 py-3 text-[var(--nova-akzent)]">{a.pruefnummer}</td><td className="px-4 py-3">{a.artikel.artikelnummer}</td><td className="px-4 py-3">{a.typ}</td><td className="px-4 py-3">{zahl(a.pruefmenge)}</td><td className="px-4 py-3">{a.prioritaet}</td><td className="px-4 py-3">{a.status}</td></tr>)}</tbody></table></div>; }
function SperrTabelle({ positionen, onFreigeben }: { positionen: Sperrbestand[]; onFreigeben: (id: number) => void }) { return <div className="mt-8 overflow-auto rounded-2xl border border-[var(--nova-rand)]"><table className="w-full text-sm"><thead className="bg-[var(--nova-flaeche)]"><tr>{["Artikel", "Lagerplatz", "Menge", "Grund", "Status", "Aktion"].map((t) => <th key={t} className="px-4 py-3 text-left">{t}</th>)}</tr></thead><tbody>{positionen.map((s) => <tr key={s.id} className="border-t border-[var(--nova-rand)]"><td className="px-4 py-3">{s.artikel.artikelnummer}</td><td className="px-4 py-3">{s.lagerplatz?.code ?? "–"}</td><td className="px-4 py-3">{zahl(s.menge)}</td><td className="px-4 py-3">{s.grund}</td><td className="px-4 py-3 text-amber-400">{s.status}</td><td className="px-4 py-3">{s.status === "GESPERRT" ? <button onClick={() => onFreigeben(s.id)} className="rounded-lg bg-[var(--nova-akzent)] px-3 py-2 text-white">Freigeben</button> : "–"}</td></tr>)}</tbody></table></div>; }
function KonfektionBereich({ auftraege, artikel, lagerplaetze, formular, setFormular, onAnlegen, onAbschliessen }: { auftraege: Konfektion[]; artikel: Artikel[]; lagerplaetze: Lagerplatz[]; formular: Record<string, string>; setFormular: React.Dispatch<React.SetStateAction<Record<string, string>>>; onAnlegen: (e: FormEvent<HTMLFormElement>) => void; onAbschliessen: (id: number, i: string, a: string) => void }) { return <><form onSubmit={onAnlegen} className="mt-8 grid gap-4 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5 md:grid-cols-3"><Auswahl label="Artikel" wert={formular.artikelId ?? ""} onChange={(v) => setFormular((a) => ({ ...a, artikelId: v }))} optionen={artikel.map((a) => [String(a.id), `${a.artikelnummer} · ${a.produktname}`])} /><Feld label="Arbeitsschritt" wert={formular.arbeitsschritt ?? ""} onChange={(v) => setFormular((a) => ({ ...a, arbeitsschritt: v }))} /><Feld label="Soll-Menge" typ="number" wert={formular.sollMenge ?? ""} onChange={(v) => setFormular((a) => ({ ...a, sollMenge: v }))} /><Auswahl label="Von Lagerplatz" erforderlich={false} wert={formular.vonLagerplatzId ?? ""} onChange={(v) => setFormular((a) => ({ ...a, vonLagerplatzId: v }))} optionen={lagerplaetze.map((l) => [String(l.id), l.code])} /><Auswahl label="Nach Lagerplatz" erforderlich={false} wert={formular.nachLagerplatzId ?? ""} onChange={(v) => setFormular((a) => ({ ...a, nachLagerplatzId: v }))} optionen={lagerplaetze.map((l) => [String(l.id), l.code])} /><Feld label="Bearbeiter" erforderlich={false} wert={formular.bearbeiter ?? ""} onChange={(v) => setFormular((a) => ({ ...a, bearbeiter: v }))} /><div className="md:col-span-3"><Primaer text="Konfektionsauftrag anlegen" /></div></form><div className="mt-6 space-y-4">{auftraege.map((k) => <KonfektionKarte key={k.id} auftrag={k} onAbschliessen={onAbschliessen} />)}</div></>; }
function KonfektionKarte({ auftrag, onAbschliessen }: { auftrag: Konfektion; onAbschliessen: (id: number, i: string, a: string) => void }) { const [i, setI] = useState(String(auftrag.sollMenge)); const [a, setA] = useState("0"); return <div className="grid gap-4 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5 md:grid-cols-[1fr_150px_150px_auto] md:items-end"><div><b>{auftrag.auftragsnummer} · {auftrag.artikel.artikelnummer}</b><p className="text-sm text-[var(--nova-text-schwaecher)]">{auftrag.arbeitsschritt} · Soll {zahl(auftrag.sollMenge)} · {auftrag.status}</p></div>{auftrag.status !== "ABGESCHLOSSEN" ? <><Feld label="Ist-Menge" typ="number" wert={i} onChange={setI} /><Feld label="Ausschuss" typ="number" wert={a} onChange={setA} /><button onClick={() => onAbschliessen(auftrag.id, i, a)} className="rounded-xl bg-[var(--nova-akzent)] px-4 py-3 text-white">Abschließen</button></> : <div className="md:col-span-3 text-right text-emerald-400">Ist {zahl(auftrag.istMenge)} · Ausschuss {zahl(auftrag.ausschussMenge)}</div>}</div>; }

function Feld({ label, wert, onChange, typ = "text", erforderlich = true }: { label: string; wert: string; onChange: (v: string) => void; typ?: string; erforderlich?: boolean }) { return <label className="block text-sm"><span className="mb-2 block font-medium">{label}</span><input required={erforderlich} type={typ} step="any" value={wert} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-4 py-3 outline-none focus:border-[var(--nova-akzent)]" /></label>; }
function Auswahl({ label, wert, onChange, optionen, erforderlich = true }: { label: string; wert: string; onChange: (v: string) => void; optionen: string[][]; erforderlich?: boolean }) { return <label className="block text-sm"><span className="mb-2 block font-medium">{label}</span><select required={erforderlich} value={wert} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-4 py-3"><option value="">Bitte auswählen</option>{optionen.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>; }
function Primaer({ text }: { text: string }) { return <button type="submit" className="w-full rounded-xl bg-[var(--nova-akzent)] px-5 py-3 font-semibold text-white">{text}</button>; }
function Karte({ titel, wert }: { titel: string; wert: number }) { return <div className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-6"><p className="text-sm text-[var(--nova-text-schwaecher)]">{titel}</p><p className="mt-3 text-3xl font-bold">{wert}</p></div>; }
function Hinweis({ children, gruen, rot }: { children: React.ReactNode; gruen?: boolean; rot?: boolean }) { return <div className={`mt-6 rounded-xl border p-4 text-sm ${gruen ? "border-emerald-800 bg-emerald-950/40 text-emerald-300" : rot ? "border-red-900 bg-red-950/50 text-red-300" : "border-[var(--nova-rand)] bg-[var(--nova-flaeche)]"}`}>{children}</div>; }
function Leer({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-[var(--nova-rand)] p-12 text-center text-[var(--nova-text-schwaecher)]">{text}</div>; }
function zahl(w: number) { return Number(w).toLocaleString("de-DE", { maximumFractionDigits: 2 }); }
