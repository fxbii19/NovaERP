"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import useLiveUpdates from "@/hooks/useLiveUpdates";

export type MitarbeiterModus = "uebersicht" | "aufgaben" | "schichten" | "arbeitsauftraege" | "nachrichten" | "aktivitaeten";

type Person = { id: number; personalnummer: string; vorname: string; nachname: string; email: string; abteilung: string; rollenprofilCode: string; letzteAnmeldungAm: string | null };
type Zugeordnet = { vorname: string; nachname: string; personalnummer: string };
type Aufgabe = { id: number; titel: string; beschreibung: string | null; status: string; prioritaet: string; faelligAm: string | null; benutzerId: number; benutzer: Zugeordnet };
type Schicht = { id: number; datum: string; startzeit: string; endzeit: string; bereich: string; status: string; notiz: string | null; benutzer: Zugeordnet };
type Arbeitsauftrag = Aufgabe & { nummer: string; begonnenAm: string | null; abgeschlossenAm: string | null };
type Nachricht = { id: number; titel: string; nachricht: string; typ: string; gelesen: boolean; erstelltVon: string | null; erstelltAm: string; benutzer: Zugeordnet };
type Protokoll = { id: number; modul: string; aktion: string; details: string | null; stufe: string; benutzer: string | null; erstelltAm: string };
type Daten = { erweitert: boolean; angemeldet: { id: number }; benutzer: Person[]; aufgaben: Aufgabe[]; schichten: Schicht[]; arbeitsauftraege: Arbeitsauftrag[]; benachrichtigungen: Nachricht[]; protokolle: Protokoll[]; aktualisiertAm: string };

const navigation = [
  ["uebersicht", "Übersicht", "/mitarbeiter"], ["aufgaben", "Aufgaben", "/mitarbeiter/aufgaben"],
  ["schichten", "Schichtplanung", "/mitarbeiter/schichten"], ["arbeitsauftraege", "Arbeitsaufträge", "/mitarbeiter/arbeitsauftraege"],
  ["nachrichten", "Nachrichten", "/mitarbeiter/nachrichten"], ["aktivitaeten", "Aktivitäten", "/mitarbeiter/aktivitaeten"],
] as const;

const feld = "rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-3 py-2.5 text-[var(--nova-text)] outline-none focus:border-[var(--nova-akzent)]";
const karte = "rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5";
const button = "rounded-xl bg-[var(--nova-akzent)] px-4 py-2.5 font-semibold text-white transition hover:brightness-110 disabled:opacity-50";

function name(person: Zugeordnet | Person) { return `${person.vorname} ${person.nachname}`; }
function datum(wert: string | null) { return wert ? new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(new Date(wert)) : "–"; }
function zeit(wert: string) { return new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" }).format(new Date(wert)); }
function statusText(wert: string) { return wert.replaceAll("_", " ").toLowerCase().replace(/^./, (a) => a.toUpperCase()); }

export default function MitarbeiterModul({ modus }: { modus: MitarbeiterModus }) {
  const [daten, setDaten] = useState<Daten | null>(null);
  const [fehler, setFehler] = useState("");
  const [laedt, setLaedt] = useState(true);
  const [sendet, setSendet] = useState(false);
  const [meldung, setMeldung] = useState("");

  const laden = useCallback(async () => {
    try {
      const antwort = await fetch("/api/mitarbeiter", { cache: "no-store" });
      const json = await antwort.json();
      if (!antwort.ok) throw new Error(json.fehler || "Daten konnten nicht geladen werden.");
      setDaten(json); setFehler("");
    } catch (error) { setFehler(error instanceof Error ? error.message : "Daten konnten nicht geladen werden."); }
    finally { setLaedt(false); }
  }, []);

  useEffect(() => { void laden(); }, [laden]);
  useLiveUpdates(() => void laden());

  async function senden(payload: Record<string, unknown>) {
    setSendet(true); setMeldung("");
    try {
      const optionen: RequestInit = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) };
      let antwort: Response;
      try {
        antwort = await fetch("/api/mitarbeiter", optionen);
      } catch {
        await new Promise((auflosen) => setTimeout(auflosen, 500));
        antwort = await fetch("/api/mitarbeiter", optionen);
      }
      const json = await antwort.json();
      if (!antwort.ok) throw new Error(json.fehler || "Aktion fehlgeschlagen.");
      setMeldung("Änderung wurde gespeichert."); await laden(); return true;
    } catch (error) {
      const nachricht = error instanceof Error && error.message !== "Failed to fetch"
        ? error.message
        : "Die Verbindung wurde kurz unterbrochen. Bitte erneut versuchen.";
      setMeldung(nachricht); return false;
    }
    finally { setSendet(false); }
  }

  const heute = new Date().toDateString();
  const kennzahlen = useMemo(() => daten ? [
    ["Aktive Mitarbeiter", daten.benutzer.length],
    ["Offene Aufgaben", daten.aufgaben.filter((x) => x.status !== "ERLEDIGT").length],
    ["Schichten heute", daten.schichten.filter((x) => new Date(x.datum).toDateString() === heute).length],
    ["Ungelesene Nachrichten", daten.benachrichtigungen.filter((x) => !x.gelesen && x.benutzer && (!daten.erweitert || true)).length],
  ] : [], [daten, heute]);

  return <main className="min-h-screen bg-[var(--nova-hintergrund)] px-8 py-8 text-[var(--nova-text)]">
    <div className="mx-auto max-w-7xl">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-1 text-sm font-bold uppercase tracking-[0.25em] text-[var(--nova-akzent)]">Organisation</p><h1 className="text-4xl font-bold">Mitarbeiter</h1><p className="mt-2 text-[var(--nova-text-schwaecher)]">Aufgaben, Schichten und interne Zusammenarbeit an einem Ort.</p></div>
        <button onClick={() => void laden()} className={button}>Live aktualisieren</button>
      </div>
      <nav className="mb-7 flex gap-2 overflow-x-auto pb-2">{navigation.map(([id, label, href]) => <Link key={id} href={href} className={`whitespace-nowrap rounded-xl border px-4 py-2.5 transition ${modus === id ? "border-[var(--nova-akzent)] bg-[var(--nova-akzent)] text-white" : "border-[var(--nova-rand)] bg-[var(--nova-flaeche)] hover:border-[var(--nova-akzent)]"}`}>{label}</Link>)}</nav>
      {fehler && <div className="mb-5 rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-red-300">{fehler}</div>}
      {meldung && <div className="mb-5 rounded-xl border border-[var(--nova-akzent)]/40 bg-[var(--nova-akzent-transparent)] p-4">{meldung}</div>}
      {laedt && !daten ? <div className={karte}>Mitarbeiterdaten werden geladen…</div> : daten && <>
        {modus === "uebersicht" && <Uebersicht daten={daten} kennzahlen={kennzahlen} />}
        {modus === "aufgaben" && <Aufgaben daten={daten} senden={senden} sendet={sendet} />}
        {modus === "schichten" && <Schichten daten={daten} senden={senden} sendet={sendet} />}
        {modus === "arbeitsauftraege" && <Arbeitsauftraege daten={daten} senden={senden} sendet={sendet} />}
        {modus === "nachrichten" && <Nachrichten daten={daten} senden={senden} sendet={sendet} />}
        {modus === "aktivitaeten" && <Aktivitaeten daten={daten} />}
        <p className="mt-4 text-right text-xs text-[var(--nova-text-schwaecher)]">Stand: {zeit(daten.aktualisiertAm)} · automatische Aktualisierung alle 15 Sekunden</p>
      </>}
    </div>
  </main>;
}

function Uebersicht({ daten, kennzahlen }: { daten: Daten; kennzahlen: (string | number)[][] }) {
  return <div className="space-y-6">
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{kennzahlen.map(([label, wert]) => <div className={karte} key={label}><p className="text-sm text-[var(--nova-text-schwaecher)]">{label}</p><p className="mt-2 text-3xl font-bold">{wert}</p></div>)}</div>
    <section className={karte}><h2 className="text-xl font-bold">Mitarbeiterübersicht</h2><p className="mt-1 text-sm text-[var(--nova-text-schwaecher)]">Organisatorische Übersicht ohne Leistungsbewertung.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{daten.benutzer.map((person) => <div key={person.id} className="rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] p-4"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--nova-akzent-transparent)] font-bold text-[var(--nova-akzent)]">{person.vorname[0]}{person.nachname[0]}</div><div className="min-w-0"><p className="font-semibold">{name(person)}</p><p className="text-sm text-[var(--nova-text-schwaecher)]">{person.abteilung} · {person.personalnummer}</p><p className="truncate text-sm text-[var(--nova-akzent)]">{person.email}</p></div></div><p className="mt-3 text-xs text-[var(--nova-text-schwaecher)]">Letzte Anmeldung: {person.letzteAnmeldungAm ? zeit(person.letzteAnmeldungAm) : "Noch keine Anmeldung"}</p></div>)}</div>
    </section>
  </div>;
}

function ZuweisungForm({ daten, art, senden, sendet }: { daten: Daten; art: "aufgabe" | "arbeitsauftrag"; senden: (p: Record<string, unknown>) => Promise<boolean>; sendet: boolean }) {
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); if (await senden({ aktion: `${art}-anlegen`, benutzerId: Number(form.get("benutzerId")), titel: form.get("titel"), beschreibung: form.get("beschreibung"), prioritaet: form.get("prioritaet"), faelligAm: form.get("faelligAm") })) event.currentTarget.reset(); }
  return <form onSubmit={submit} className={`${karte} grid gap-3 md:grid-cols-2 xl:grid-cols-5`}><select required name="benutzerId" className={feld}><option value="">Mitarbeiter wählen</option>{daten.benutzer.map((p) => <option key={p.id} value={p.id}>{name(p)}</option>)}</select><input required name="titel" className={feld} placeholder="Titel"/><input name="beschreibung" className={feld} placeholder="Beschreibung"/><select name="prioritaet" className={feld}><option value="NORMAL">Normal</option><option value="HOCH">Hoch</option><option value="KRITISCH">Kritisch</option></select><div className="flex gap-2"><input name="faelligAm" type="date" className={`${feld} min-w-0 flex-1`}/><button disabled={sendet} className={button}>Anlegen</button></div></form>;
}

function Aufgaben({ daten, senden, sendet }: { daten: Daten; senden: (p: Record<string, unknown>) => Promise<boolean>; sendet: boolean }) {
  return <div className="space-y-5">{daten.erweitert && <ZuweisungForm daten={daten} art="aufgabe" senden={senden} sendet={sendet}/>}<div className="grid gap-4 md:grid-cols-2">{daten.aufgaben.map((x) => <article key={x.id} className={karte}><div className="flex justify-between gap-3"><div><p className="font-bold">{x.titel}</p><p className="text-sm text-[var(--nova-text-schwaecher)]">{name(x.benutzer)} · fällig {datum(x.faelligAm)}</p></div><span className="h-fit rounded-full bg-[var(--nova-akzent-transparent)] px-3 py-1 text-xs text-[var(--nova-akzent)]">{x.prioritaet}</span></div>{x.beschreibung && <p className="mt-3 text-sm">{x.beschreibung}</p>}<div className="mt-4 flex items-center justify-between"><span className="text-sm">{statusText(x.status)}</span>{x.status !== "ERLEDIGT" && <button disabled={sendet} onClick={() => void senden({ aktion: "aufgabe-status", id: x.id, status: "ERLEDIGT" })} className={button}>Erledigt</button>}</div></article>)}{daten.aufgaben.length === 0 && <Leere text="Keine Aufgaben vorhanden."/>}</div></div>;
}

function Schichten({ daten, senden, sendet }: { daten: Daten; senden: (p: Record<string, unknown>) => Promise<boolean>; sendet: boolean }) {
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const f = new FormData(event.currentTarget); if (await senden({ aktion: "schicht-anlegen", benutzerId: Number(f.get("benutzerId")), datum: f.get("datum"), startzeit: f.get("startzeit"), endzeit: f.get("endzeit"), bereich: f.get("bereich"), notiz: f.get("notiz") })) event.currentTarget.reset(); }
  return <div className="space-y-5">{daten.erweitert && <form onSubmit={submit} className={`${karte} grid gap-3 md:grid-cols-3 xl:grid-cols-6`}><select required name="benutzerId" className={feld}><option value="">Mitarbeiter</option>{daten.benutzer.map(p => <option key={p.id} value={p.id}>{name(p)}</option>)}</select><input required type="date" name="datum" className={feld}/><input required type="time" name="startzeit" className={feld}/><input required type="time" name="endzeit" className={feld}/><input required name="bereich" placeholder="Bereich" className={feld}/><button disabled={sendet} className={button}>Schicht planen</button></form>}
    <div className={`${karte} overflow-x-auto`}><table className="w-full min-w-[700px] text-left"><thead className="text-sm text-[var(--nova-text-schwaecher)]"><tr><th className="pb-3">Datum</th><th>Mitarbeiter</th><th>Zeit</th><th>Bereich</th><th>Status</th></tr></thead><tbody>{daten.schichten.map(x => <tr className="border-t border-[var(--nova-rand)]" key={x.id}><td className="py-4">{datum(x.datum)}</td><td>{name(x.benutzer)}</td><td>{x.startzeit}–{x.endzeit}</td><td>{x.bereich}</td><td>{statusText(x.status)}</td></tr>)}</tbody></table>{daten.schichten.length === 0 && <p className="py-6 text-center text-[var(--nova-text-schwaecher)]">Noch keine Schichten geplant.</p>}</div></div>;
}

function Arbeitsauftraege({ daten, senden, sendet }: { daten: Daten; senden: (p: Record<string, unknown>) => Promise<boolean>; sendet: boolean }) {
  return <div className="space-y-5">{daten.erweitert && <ZuweisungForm daten={daten} art="arbeitsauftrag" senden={senden} sendet={sendet}/>}<div className="grid gap-4 md:grid-cols-2">{daten.arbeitsauftraege.map(x => <article className={karte} key={x.id}><p className="text-xs font-bold text-[var(--nova-akzent)]">{x.nummer}</p><h3 className="mt-1 text-lg font-bold">{x.titel}</h3><p className="text-sm text-[var(--nova-text-schwaecher)]">{name(x.benutzer)} · fällig {datum(x.faelligAm)}</p>{x.beschreibung && <p className="mt-3">{x.beschreibung}</p>}<div className="mt-4 flex flex-wrap items-center gap-2"><span className="mr-auto text-sm">{statusText(x.status)}</span>{x.status === "OFFEN" && <button className={button} onClick={() => void senden({ aktion: "arbeitsauftrag-status", id: x.id, status: "IN_ARBEIT" })}>Starten</button>}{x.status === "IN_ARBEIT" && <button className={button} onClick={() => void senden({ aktion: "arbeitsauftrag-status", id: x.id, status: "ABGESCHLOSSEN" })}>Abschließen</button>}</div></article>)}{daten.arbeitsauftraege.length === 0 && <Leere text="Keine digitalen Arbeitsaufträge vorhanden."/>}</div></div>;
}

function Nachrichten({ daten, senden, sendet }: { daten: Daten; senden: (p: Record<string, unknown>) => Promise<boolean>; sendet: boolean }) {
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const f = new FormData(event.currentTarget); if (await senden({ aktion: "nachricht-senden", benutzerId: Number(f.get("benutzerId")), titel: f.get("titel"), nachricht: f.get("nachricht"), typ: f.get("typ") })) event.currentTarget.reset(); }
  return <div className="space-y-5">{daten.erweitert && <form onSubmit={submit} className={`${karte} grid gap-3 md:grid-cols-2 xl:grid-cols-5`}><select required name="benutzerId" className={feld}><option value="">Empfänger</option>{daten.benutzer.map(p => <option key={p.id} value={p.id}>{name(p)}</option>)}</select><input required name="titel" className={feld} placeholder="Betreff"/><input required name="nachricht" className={`${feld} xl:col-span-2`} placeholder="Interne Nachricht"/><div className="flex gap-2"><select name="typ" className={`${feld} min-w-0 flex-1`}><option value="INFO">Info</option><option value="WICHTIG">Wichtig</option><option value="WARNUNG">Warnung</option></select><button disabled={sendet} className={button}>Senden</button></div></form>}
    <div className="space-y-3">{daten.benachrichtigungen.map(x => <article key={x.id} className={`${karte} ${x.gelesen ? "opacity-70" : "border-[var(--nova-akzent)]"}`}><div className="flex gap-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{x.titel}</h3><span className="rounded-full bg-[var(--nova-akzent-transparent)] px-2 py-0.5 text-xs text-[var(--nova-akzent)]">{x.typ}</span></div><p className="mt-2">{x.nachricht}</p><p className="mt-2 text-xs text-[var(--nova-text-schwaecher)]">An {name(x.benutzer)} · von {x.erstelltVon || "NOVA"} · {zeit(x.erstelltAm)}</p></div>{!x.gelesen && <button onClick={() => void senden({ aktion: "nachricht-gelesen", id: x.id })} className={button}>Gelesen</button>}</div></article>)}{daten.benachrichtigungen.length === 0 && <Leere text="Keine internen Nachrichten vorhanden."/>}</div></div>;
}

function Aktivitaeten({ daten }: { daten: Daten }) { return <div className={`${karte} overflow-x-auto`}><p className="mb-4 text-sm text-[var(--nova-text-schwaecher)]">{daten.erweitert ? "Protokoll der organisatorischen Vorgänge." : "Deine eigenen protokollierten Vorgänge."}</p><table className="w-full min-w-[750px] text-left"><thead className="text-sm text-[var(--nova-text-schwaecher)]"><tr><th className="pb-3">Zeit</th><th>Modul</th><th>Aktion</th><th>Details</th><th>Benutzer</th></tr></thead><tbody>{daten.protokolle.map(x => <tr key={x.id} className="border-t border-[var(--nova-rand)]"><td className="py-4">{zeit(x.erstelltAm)}</td><td>{x.modul}</td><td>{x.aktion}</td><td>{x.details || "–"}</td><td>{x.benutzer || "System"}</td></tr>)}</tbody></table>{daten.protokolle.length === 0 && <p className="py-6 text-center text-[var(--nova-text-schwaecher)]">Noch keine Aktivitäten vorhanden.</p>}</div>; }
function Leere({ text }: { text: string }) { return <div className={`${karte} text-center text-[var(--nova-text-schwaecher)]`}>{text}</div>; }
