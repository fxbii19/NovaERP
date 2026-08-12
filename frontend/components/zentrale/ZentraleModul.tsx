"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import NovaSidebar from "@/components/NovaSidebar";

type Modus = "uebersicht" | "telefon" | "abwesenheiten" | "stempeluhr";
type Telefonat = { id: number; anrufer: string; firma?: string; telefonnummer?: string; betreff: string; notiz?: string; sachbearbeiter?: string; status: string; angenommenVon: string; angenommenAm: string };
type Abwesenheit = { id: number; mitarbeiter: string; art: string; von: string; bis: string; status: string; notiz?: string };
type Zeitbuchung = { id: number; benutzerId: number; mitarbeiter: string; typ: string; zeitpunkt: string };
type Mitarbeiter = { id: number; vorname: string; nachname: string; abteilung: string };
type Daten = { telefonate: Telefonat[]; abwesenheiten: Abwesenheit[]; zeitbuchungen: Zeitbuchung[]; mitarbeiter: Mitarbeiter[]; eigenerBenutzerId: number };

const TITEL: Record<Modus, [string, string]> = {
  uebersicht: ["Zentrale", "Anrufe, Erreichbarkeit und interne Vorgänge auf einen Blick"],
  telefon: ["Telefonzentrale", "Kundenanrufe aufnehmen und an den richtigen Sachbearbeiter weiterleiten"],
  abwesenheiten: ["Abwesenheiten", "Urlaub, Krankheit und sonstige Abwesenheiten zentral eintragen"],
  stempeluhr: ["Stempeluhr", "Arbeitsbeginn und Feierabend digital erfassen"],
};

export default function ZentraleModul({ modus }: { modus: Modus }) {
  const [daten, setDaten] = useState<Daten | null>(null);
  const [fehler, setFehler] = useState("");
  const [sendet, setSendet] = useState(false);
  const [laedt, setLaedt] = useState(false);
  const [aktualisiert, setAktualisiert] = useState(false);
  const [telefon, setTelefon] = useState({ anrufer: "", firma: "", telefonnummer: "", betreff: "", sachbearbeiter: "", notiz: "" });
  const [abwesenheit, setAbwesenheit] = useState({ benutzerId: "", art: "Urlaub", von: "", bis: "", notiz: "" });

  const laden = useCallback(async () => {
    setLaedt(true);
    try {
      const antwort = await fetch(`/api/zentrale?zeit=${Date.now()}`, { cache: "no-store", headers: { "Cache-Control": "no-cache" } });
      const inhalt = await antwort.json();
      if (!antwort.ok) throw new Error(inhalt.fehler ?? "Zentrale konnte nicht geladen werden.");
      setDaten(inhalt);
      setFehler("");
      setAktualisiert(true);
      window.setTimeout(() => setAktualisiert(false), 1800);
    } catch (error) { setFehler(error instanceof Error ? error.message : "Unbekannter Fehler"); }
    finally { setLaedt(false); }
  }, []);

  useEffect(() => { void laden(); }, [laden]);

  async function senden(aktion: string, inhalt: Record<string, unknown>) {
    setSendet(true); setFehler("");
    try {
      const antwort = await fetch("/api/zentrale", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aktion, ...inhalt }) });
      const ergebnis = await antwort.json();
      if (!antwort.ok) throw new Error(ergebnis.fehler ?? "Speichern fehlgeschlagen.");
      await laden();
      return true;
    } catch (error) { setFehler(error instanceof Error ? error.message : "Unbekannter Fehler"); return false; }
    finally { setSendet(false); }
  }

  async function telefonSpeichern(event: FormEvent) {
    event.preventDefault();
    if (await senden("telefonat-erfassen", telefon)) setTelefon({ anrufer: "", firma: "", telefonnummer: "", betreff: "", sachbearbeiter: "", notiz: "" });
  }

  async function abwesenheitSpeichern(event: FormEvent) {
    event.preventDefault();
    if (await senden("abwesenheit-erfassen", abwesenheit)) setAbwesenheit({ benutzerId: "", art: "Urlaub", von: "", bis: "", notiz: "" });
  }

  const offeneTelefonate = daten?.telefonate.filter((t) => t.status === "OFFEN") ?? [];
  const anwesend = useMemo(() => {
    if (!daten) return 0;
    const letzte = new Map<number, Zeitbuchung>();
    for (const b of daten.zeitbuchungen) if (!letzte.has(b.benutzerId)) letzte.set(b.benutzerId, b);
    return [...letzte.values()].filter((b) => b.typ === "KOMMEN").length;
  }, [daten]);
  const eigeneLetzteBuchung = daten?.zeitbuchungen.find((b) => b.benutzerId === daten.eigenerBenutzerId);
  const [titel, untertitel] = TITEL[modus];

  return <main className="min-h-screen bg-[var(--nova-hintergrund)] text-[var(--nova-text)]"><NovaSidebar /><section className="ml-20 px-8 py-8"><div className="mx-auto max-w-7xl"><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--nova-akzent)]">Organisation</p><h1 className="mt-2 text-4xl font-bold">{titel}</h1><p className="mt-2 text-[var(--nova-text-schwaecher)]">{untertitel}</p></div><button type="button" disabled={laedt} onClick={() => void laden()} className="rounded-xl border border-[var(--nova-rand)] px-4 py-3 font-semibold hover:bg-[var(--nova-flaeche-hover)] disabled:opacity-60">{laedt ? "Wird aktualisiert …" : aktualisiert ? "✓ Aktualisiert" : "Aktualisieren"}</button></div>
    {fehler && <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">{fehler}</div>}
    {!daten && !fehler && <div className="mt-8 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-8">Daten werden geladen...</div>}
    {daten && modus === "uebersicht" && <><div className="mt-8 grid gap-4 md:grid-cols-3"><Karte titel="Offene Rückrufe" wert={offeneTelefonate.length} farbe="text-amber-400" /><Karte titel="Heute anwesend" wert={anwesend} farbe="text-emerald-400" /><Karte titel="Aktuelle Abwesenheiten" wert={daten.abwesenheiten.length} farbe="text-sky-400" /></div><div className="mt-8 grid gap-6 xl:grid-cols-2"><Liste titel="Offene Telefonate">{offeneTelefonate.slice(0, 6).map((t) => <TelefonZeile key={t.id} telefonat={t} onErledigen={() => void senden("telefonat-erledigen", { id: t.id })} />)}{offeneTelefonate.length === 0 && <Leer text="Keine offenen Rückrufe." />}</Liste><Liste titel="Kommende Abwesenheiten">{daten.abwesenheiten.slice(0, 6).map((a) => <AbwesenheitZeile key={a.id} eintrag={a} />)}{daten.abwesenheiten.length === 0 && <Leer text="Keine Abwesenheiten eingetragen." />}</Liste></div></>}
    {daten && modus === "telefon" && <div className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]"><Formular titel="Anruf erfassen"><form onSubmit={telefonSpeichern} className="space-y-4"><Eingabe label="Anrufer *" wert={telefon.anrufer} onChange={(v) => setTelefon({ ...telefon, anrufer: v })} /><div className="grid gap-4 sm:grid-cols-2"><Eingabe label="Firma" wert={telefon.firma} onChange={(v) => setTelefon({ ...telefon, firma: v })} /><Eingabe label="Telefonnummer" wert={telefon.telefonnummer} onChange={(v) => setTelefon({ ...telefon, telefonnummer: v })} /></div><Eingabe label="Betreff *" wert={telefon.betreff} onChange={(v) => setTelefon({ ...telefon, betreff: v })} /><Auswahl label="Weiterleiten an" wert={telefon.sachbearbeiter} onChange={(v) => setTelefon({ ...telefon, sachbearbeiter: v })}><option value="">Noch nicht zugewiesen</option>{daten.mitarbeiter.map((m) => <option key={m.id} value={`${m.vorname} ${m.nachname}`}>{m.vorname} {m.nachname} · {m.abteilung}</option>)}</Auswahl><Eingabe label="Notiz" wert={telefon.notiz} onChange={(v) => setTelefon({ ...telefon, notiz: v })} /><Speichern sendet={sendet} text="Anruf aufnehmen" /></form></Formular><Liste titel="Offene Anrufe und Rückrufe">{offeneTelefonate.map((t) => <TelefonZeile key={t.id} telefonat={t} onErledigen={() => void senden("telefonat-erledigen", { id: t.id })} />)}{offeneTelefonate.length === 0 && <Leer text="Keine offenen Telefonate." />}</Liste></div>}
    {daten && modus === "abwesenheiten" && <div className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]"><Formular titel="Abwesenheit eintragen"><form onSubmit={abwesenheitSpeichern} className="space-y-4"><Auswahl label="Mitarbeiter *" wert={abwesenheit.benutzerId} onChange={(v) => setAbwesenheit({ ...abwesenheit, benutzerId: v })}><option value="">Bitte auswählen</option>{daten.mitarbeiter.map((m) => <option key={m.id} value={m.id}>{m.vorname} {m.nachname} · {m.abteilung}</option>)}</Auswahl><Auswahl label="Art" wert={abwesenheit.art} onChange={(v) => setAbwesenheit({ ...abwesenheit, art: v })}><option>Urlaub</option><option>Krankheit</option><option>Berufsschule</option><option>Dienstreise</option><option>Sonstiges</option></Auswahl><div className="grid gap-4 sm:grid-cols-2"><Eingabe label="Von *" typ="date" wert={abwesenheit.von} onChange={(v) => setAbwesenheit({ ...abwesenheit, von: v })} /><Eingabe label="Bis *" typ="date" wert={abwesenheit.bis} onChange={(v) => setAbwesenheit({ ...abwesenheit, bis: v })} /></div><Eingabe label="Notiz" wert={abwesenheit.notiz} onChange={(v) => setAbwesenheit({ ...abwesenheit, notiz: v })} /><Speichern sendet={sendet} text="Abwesenheit speichern" /></form></Formular><Liste titel="Eingetragene Abwesenheiten">{daten.abwesenheiten.map((a) => <AbwesenheitZeile key={a.id} eintrag={a} />)}{daten.abwesenheiten.length === 0 && <Leer text="Keine Abwesenheiten eingetragen." />}</Liste></div>}
    {daten && modus === "stempeluhr" && <><div className="mt-8 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-8 text-center"><p className="text-[var(--nova-text-schwaecher)]">Dein aktueller Status</p><p className={`mt-3 text-3xl font-bold ${eigeneLetzteBuchung?.typ === "KOMMEN" ? "text-emerald-400" : "text-slate-300"}`}>{eigeneLetzteBuchung?.typ === "KOMMEN" ? "Eingestempelt" : "Ausgestempelt"}</p><button disabled={sendet} onClick={() => void senden("zeit-buchen", {})} className={`mt-7 rounded-2xl px-10 py-4 text-lg font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-50 ${eigeneLetzteBuchung?.typ === "KOMMEN" ? "bg-red-500" : "bg-emerald-500"}`}>{eigeneLetzteBuchung?.typ === "KOMMEN" ? "Feierabend stempeln" : "Arbeitsbeginn stempeln"}</button></div><Liste titel="Heutige Buchungen">{daten.zeitbuchungen.map((b) => <div key={b.id} className="flex items-center justify-between border-t border-[var(--nova-rand)] px-5 py-4 first:border-0"><div><p className="font-semibold">{b.mitarbeiter}</p><p className="text-sm text-[var(--nova-text-schwaecher)]">{new Date(b.zeitpunkt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr</p></div><span className={b.typ === "KOMMEN" ? "text-emerald-400" : "text-red-300"}>{b.typ === "KOMMEN" ? "Arbeitsbeginn" : "Feierabend"}</span></div>)}</Liste></>}
  </div></section></main>;
}

function Karte({ titel, wert, farbe }: { titel: string; wert: number; farbe: string }) { return <div className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-6"><p className="text-sm text-[var(--nova-text-schwaecher)]">{titel}</p><p className={`mt-3 text-3xl font-bold ${farbe}`}>{wert}</p></div>; }
function Liste({ titel, children }: { titel: string; children: React.ReactNode }) { return <section className="mt-6 overflow-hidden rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] xl:mt-0"><h2 className="border-b border-[var(--nova-rand)] px-5 py-4 text-xl font-semibold">{titel}</h2>{children}</section>; }
function Formular({ titel, children }: { titel: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-6"><h2 className="mb-5 text-xl font-semibold">{titel}</h2>{children}</section>; }
function Eingabe({ label, wert, onChange, typ = "text" }: { label: string; wert: string; onChange: (v: string) => void; typ?: string }) { return <label className="block text-sm"><span className="mb-2 block text-[var(--nova-text-schwaecher)]">{label}</span><input required={label.includes("*")} type={typ} value={wert} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-4 py-3 outline-none focus:border-[var(--nova-akzent)]" /></label>; }
function Auswahl({ label, wert, onChange, children }: { label: string; wert: string; onChange: (v: string) => void; children: React.ReactNode }) { return <label className="block text-sm"><span className="mb-2 block text-[var(--nova-text-schwaecher)]">{label}</span><select required={label.includes("*")} value={wert} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-4 py-3 outline-none">{children}</select></label>; }
function Speichern({ sendet, text }: { sendet: boolean; text: string }) { return <button disabled={sendet} className="w-full rounded-xl bg-[var(--nova-akzent)] px-5 py-3 font-semibold text-white disabled:opacity-50">{sendet ? "Wird gespeichert..." : text}</button>; }
function TelefonZeile({ telefonat: t, onErledigen }: { telefonat: Telefonat; onErledigen: () => void }) { return <div className="border-t border-[var(--nova-rand)] p-5 first:border-0"><div className="flex items-start justify-between gap-4"><div><p className="font-semibold">{t.anrufer}{t.firma ? ` · ${t.firma}` : ""}</p><p className="mt-1 text-sm">{t.betreff}</p><p className="mt-1 text-xs text-[var(--nova-text-schwaecher)]">An: {t.sachbearbeiter || "nicht zugewiesen"} · von {t.angenommenVon}</p></div><button onClick={onErledigen} className="rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300">Erledigt</button></div></div>; }
function AbwesenheitZeile({ eintrag: a }: { eintrag: Abwesenheit }) { return <div className="flex items-center justify-between gap-4 border-t border-[var(--nova-rand)] px-5 py-4 first:border-0"><div><p className="font-semibold">{a.mitarbeiter}</p><p className="mt-1 text-sm text-[var(--nova-text-schwaecher)]">{new Date(a.von).toLocaleDateString("de-DE")} – {new Date(a.bis).toLocaleDateString("de-DE")}</p></div><span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-300">{a.art}</span></div>; }
function Leer({ text }: { text: string }) { return <p className="p-8 text-center text-[var(--nova-text-schwaecher)]">{text}</p>; }
