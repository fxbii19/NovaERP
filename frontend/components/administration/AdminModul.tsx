"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import NovaSidebar from "@/components/NovaSidebar";
import { useAuth } from "@/hooks/useAuth";

type Rollenprofil = { id: number; code: string; name: string; beschreibung: string | null; rechteJson: string; systemrolle: boolean; aktiv: boolean };
type Einstellung = { id: number; schluessel: string; wert: string; typ: string; kategorie: string; bezeichnung: string; beschreibung: string | null; aktualisiertVon: string | null };
type Protokoll = { id: number; modul: string; aktion: string; details: string | null; stufe: string; benutzer: string | null; erstelltAm: string };
type Daten = { rollen: Rollenprofil[]; einstellungen: Einstellung[]; protokolle: Protokoll[]; module: string[] };
export type AdminModus = "uebersicht" | "rollen" | "rechte" | "system" | "protokolle";

const TITEL: Record<AdminModus, [string, string]> = {
  uebersicht: ["Benutzerverwaltung", "Benutzer, Rollen, Rechte und Systemeinstellungen"],
  rollen: ["Rollen", "Berechtigungsrollen zentral verwalten"],
  rechte: ["Rechte", "Modulzugriffe der einzelnen Rollen festlegen"],
  system: ["Systemeinstellungen", "Unternehmensweite NOVA-Einstellungen"],
  protokolle: ["Protokolle", "Administrative Änderungen und Systemereignisse nachvollziehen"],
};

export default function AdminModul({ modus }: { modus: AdminModus }) {
  const { user, istAdmin, geladen: authGeladen } = useAuth();
  const [daten, setDaten] = useState<Daten | null>(null);
  const [rollenEntwurf, setRollenEntwurf] = useState<Record<string, string[]>>({});
  const [einstellungsWerte, setEinstellungsWerte] = useState<Record<number, string>>({});
  const [suche, setSuche] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [meldung, setMeldung] = useState<string | null>(null);

  const laden = useCallback(async () => {
    try {
      const antwort = await fetch("/api/administration", { cache: "no-store" });
      const d = await antwort.json();
      if (!antwort.ok) throw new Error(d.fehler);
      setDaten(d);
      setRollenEntwurf(Object.fromEntries(d.rollen.map((r: Rollenprofil) => [r.code, JSON.parse(r.rechteJson)])));
      setEinstellungsWerte(Object.fromEntries(d.einstellungen.map((e: Einstellung) => [e.id, e.wert])));
    } catch (error) { setFehler(error instanceof Error ? error.message : "Administration konnte nicht geladen werden."); }
  }, []);

  useEffect(() => { if (authGeladen && istAdmin) void laden(); }, [authGeladen, istAdmin, laden]);

  async function senden(aktion: string, extra: Record<string, unknown>) {
    setFehler(null); setMeldung(null);
    const antwort = await fetch("/api/administration", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aktion, ...extra }) });
    const ergebnis = await antwort.json();
    if (!antwort.ok) { setFehler(ergebnis.fehler ?? "Speichern fehlgeschlagen."); return; }
    setMeldung("Änderungen wurden gespeichert."); await laden();
  }

  const protokolle = useMemo(() => daten?.protokolle.filter((p) => `${p.modul} ${p.aktion} ${p.details ?? ""} ${p.benutzer ?? ""}`.toLowerCase().includes(suche.toLowerCase())) ?? [], [daten, suche]);
  const [titel, untertitel] = TITEL[modus];

  if (!authGeladen) return <main className="min-h-screen bg-[var(--nova-hintergrund)]" />;
  if (!istAdmin) return <main className="flex min-h-screen items-center justify-center bg-[var(--nova-hintergrund)] text-[var(--nova-text)]"><div className="rounded-2xl border border-red-900 bg-red-950/40 p-8">Nur Administratoren dürfen diesen Bereich öffnen.</div></main>;

  return <main className="min-h-screen bg-[var(--nova-hintergrund)] text-[var(--nova-text)]"><NovaSidebar /><section className="ml-20 px-8 py-8"><div className="mx-auto max-w-7xl"><h1 className="text-4xl font-bold">{titel}</h1><p className="mt-2 text-[var(--nova-text-schwaecher)]">{untertitel}</p>{meldung && <Hinweis gruen>{meldung}</Hinweis>}{fehler && <Hinweis rot>{fehler}</Hinweis>}

  {daten && modus === "uebersicht" && <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4"><Karte titel="Rollen" wert={daten.rollen.length} /><Karte titel="Aktive Rollen" wert={daten.rollen.filter((r) => r.aktiv).length} /><Karte titel="Systemeinstellungen" wert={daten.einstellungen.length} /><Karte titel="Protokolle" wert={daten.protokolle.length} /></div>}

  {daten && modus === "rollen" && <div className="mt-8 grid gap-5 md:grid-cols-2">{daten.rollen.map((r) => <div key={r.id} className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-6"><div className="flex justify-between"><div><h2 className="text-xl font-semibold">{r.name}</h2><p className="text-sm text-[var(--nova-akzent)]">{r.code}</p></div><span className="rounded-full bg-[var(--nova-akzent-transparent)] px-3 py-1 text-xs text-[var(--nova-akzent)]">{r.systemrolle ? "Systemrolle" : "Eigene Rolle"}</span></div><p className="mt-4 text-sm text-[var(--nova-text-schwaecher)]">{r.beschreibung}</p><p className="mt-5 text-sm"><b>{(rollenEntwurf[r.code] ?? []).length}</b> aktive Modulrechte</p></div>)}</div>}

  {daten && modus === "rechte" && <div className="mt-8 overflow-auto rounded-2xl border border-[var(--nova-rand)]"><table className="w-full text-sm"><thead className="bg-[var(--nova-flaeche)]"><tr><th className="px-4 py-4 text-left">Rolle</th>{daten.module.map((m) => <th key={m} className="px-4 py-4 text-center capitalize">{m}</th>)}<th className="px-4 py-4">Speichern</th></tr></thead><tbody>{daten.rollen.map((r) => <tr key={r.id} className="border-t border-[var(--nova-rand)]"><td className="px-4 py-4"><b>{r.name}</b><p className="text-xs text-[var(--nova-text-schwaecher)]">{r.code}</p></td>{daten.module.map((m) => <td key={m} className="px-4 py-4 text-center"><input type="checkbox" checked={(rollenEntwurf[r.code] ?? []).includes(m)} onChange={(e) => setRollenEntwurf((aktuell) => ({ ...aktuell, [r.code]: e.target.checked ? [...(aktuell[r.code] ?? []), m] : (aktuell[r.code] ?? []).filter((x) => x !== m) }))} className="h-4 w-4 accent-[var(--nova-akzent)]" /></td>)}<td className="px-4 py-4"><button onClick={() => void senden("rolle-speichern", { code: r.code, name: r.name, beschreibung: r.beschreibung, rechte: rollenEntwurf[r.code] ?? [] })} className="rounded-lg bg-[var(--nova-akzent)] px-3 py-2 text-white">Speichern</button></td></tr>)}</tbody></table></div>}

  {daten && modus === "system" && <div className="mt-8 space-y-6">{Array.from(new Set(daten.einstellungen.map((e) => e.kategorie))).map((kategorie) => <div key={kategorie} className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-6"><h2 className="text-xl font-semibold">{kategorie}</h2><div className="mt-5 grid gap-4 md:grid-cols-2">{daten.einstellungen.filter((e) => e.kategorie === kategorie).map((e) => <div key={e.id} className="rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] p-4"><label className="text-sm font-medium">{e.bezeichnung}</label><div className="mt-2 flex gap-2">{e.typ === "BOOLEAN" ? <select value={einstellungsWerte[e.id] ?? e.wert} onChange={(x) => setEinstellungsWerte((a) => ({ ...a, [e.id]: x.target.value }))} className="min-w-0 flex-1 rounded-lg border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] px-3 py-2"><option value="true">Aktiv</option><option value="false">Inaktiv</option></select> : <input type={e.typ === "NUMBER" ? "number" : "text"} value={einstellungsWerte[e.id] ?? e.wert} onChange={(x) => setEinstellungsWerte((a) => ({ ...a, [e.id]: x.target.value }))} className="min-w-0 flex-1 rounded-lg border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] px-3 py-2" />}<button onClick={() => void senden("einstellung-speichern", { id: e.id, wert: einstellungsWerte[e.id] ?? e.wert })} className="rounded-lg bg-[var(--nova-akzent)] px-3 py-2 text-white">Speichern</button></div></div>)}</div></div>)}</div>}

  {daten && modus === "protokolle" && <><input value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Protokolle durchsuchen..." className="mt-8 w-full max-w-md rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] px-4 py-3 outline-none focus:border-[var(--nova-akzent)]" /><div className="mt-5 overflow-auto rounded-2xl border border-[var(--nova-rand)]"><table className="w-full text-sm"><thead className="bg-[var(--nova-flaeche)]"><tr>{["Zeit", "Modul", "Aktion", "Details", "Benutzer", "Stufe"].map((t) => <th key={t} className="px-4 py-3 text-left">{t}</th>)}</tr></thead><tbody>{protokolle.map((p) => <tr key={p.id} className="border-t border-[var(--nova-rand)]"><td className="whitespace-nowrap px-4 py-3">{new Date(p.erstelltAm).toLocaleString("de-DE")}</td><td className="px-4 py-3">{p.modul}</td><td className="px-4 py-3">{p.aktion}</td><td className="px-4 py-3 text-[var(--nova-text-schwaecher)]">{p.details ?? "–"}</td><td className="px-4 py-3">{p.benutzer ?? "–"}</td><td className="px-4 py-3">{p.stufe}</td></tr>)}{protokolle.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-[var(--nova-text-schwaecher)]">Keine passenden Protokolle vorhanden.</td></tr>}</tbody></table></div></>}
  </div></section></main>;
}

function Karte({ titel, wert }: { titel: string; wert: number }) { return <div className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-6"><p className="text-sm text-[var(--nova-text-schwaecher)]">{titel}</p><p className="mt-3 text-3xl font-bold">{wert}</p></div>; }
function Hinweis({ children, gruen, rot }: { children: React.ReactNode; gruen?: boolean; rot?: boolean }) { return <div className={`mt-6 rounded-xl border p-4 text-sm ${gruen ? "border-emerald-800 bg-emerald-950/40 text-emerald-300" : rot ? "border-red-900 bg-red-950/50 text-red-300" : "border-[var(--nova-rand)]"}`}>{children}</div>; }
