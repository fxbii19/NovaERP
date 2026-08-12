"use client";

import { useCallback, useEffect, useState } from "react";

type Prozessdaten = {
  aktualisiertAm: string;
  heute: { lagerbuchungenHeute: number; pruefungenHeute: number; qsAbweichungenHeute: number; qsAbweichungsquote: number; kommissionierungenHeute: number; sendungenHeute: number };
  offen: { offeneMdeVorgaenge: number; offenePruefauftraege: number; offeneKommissionierungen: number; versandbereit: number };
  system: { aktiveBenutzer: number; aktiveSitzungen: number };
  abteilungen: Array<{ name: string; aktiveBenutzer: number }>;
};

function Karte({ titel, wert, hinweis }: { titel: string; wert: string | number; hinweis: string }) {
  return <article className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5 shadow-lg">
    <p className="text-sm text-[var(--nova-text-schwaecher)]">{titel}</p><p className="mt-2 text-3xl font-bold">{wert}</p>
    <p className="mt-2 text-xs text-[var(--nova-text-schwaecher)]">{hinweis}</p>
  </article>;
}

export default function TeamUndProzessePage() {
  const [daten, setDaten] = useState<Prozessdaten | null>(null);
  const [fehler, setFehler] = useState("");
  const [laedt, setLaedt] = useState(false);
  const [aktualisiert, setAktualisiert] = useState(false);

  const laden = useCallback(async (feedback = false) => {
    if (feedback) setLaedt(true);

    try {
      const response = await fetch(
        `/api/administration/prozesse?zeit=${Date.now()}`,
        {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        }
      );
      const ergebnis = await response.json();

      if (!response.ok) {
        setFehler(ergebnis.fehler ?? "Kennzahlen konnten nicht geladen werden.");
        return;
      }

      setDaten(ergebnis);
      setFehler("");

      if (feedback) {
        setAktualisiert(true);
        window.setTimeout(() => setAktualisiert(false), 1800);
      }
    } catch {
      setFehler("Kennzahlen konnten nicht geladen werden.");
    } finally {
      if (feedback) setLaedt(false);
    }
  }, []);

  useEffect(() => { void laden(); const intervall = window.setInterval(() => void laden(), 30_000); return () => window.clearInterval(intervall); }, [laden]);

  return <main className="min-h-screen bg-[var(--nova-hintergrund)] p-8 text-[var(--nova-text)]"><div className="mx-auto max-w-7xl">
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-4xl font-bold">Team- und Prozessübersicht</h1>
      <p className="mt-2 text-[var(--nova-text-schwaecher)]">Anonyme Betriebskennzahlen ohne Mitarbeiter-Ranglisten oder persönliche Leistungsprofile.</p></div>
      <button
        type="button"
        disabled={laedt}
        onClick={() => void laden(true)}
        className="rounded-xl bg-[var(--nova-akzent)] px-5 py-3 font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--nova-akzent-hover)] hover:shadow-lg disabled:cursor-wait disabled:opacity-60"
      >
        {laedt ? "Wird aktualisiert â€¦" : aktualisiert ? "âœ“ Aktualisiert" : "Aktualisieren"}
      </button></div>
    {fehler && <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-300">{fehler}</div>}
    {!daten && !fehler && <div className="rounded-xl border border-[var(--nova-rand)] p-5">Prozesskennzahlen werden geladen …</div>}
    {daten && <><h2 className="mb-4 text-xl font-semibold">Heute</h2><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <Karte titel="Lagerbuchungen" wert={daten.heute.lagerbuchungenHeute} hinweis="Alle heutigen Lagerbewegungen" />
      <Karte titel="Qualitätsprüfungen" wert={daten.heute.pruefungenHeute} hinweis={`${daten.heute.qsAbweichungenHeute} mit Abweichung`} />
      <Karte titel="QS-Abweichungsquote" wert={`${daten.heute.qsAbweichungsquote.toLocaleString("de-DE")} %`} hinweis="Nur zusammengefasste Prozessqualität" />
      <Karte titel="Kommissionierungen" wert={daten.heute.kommissionierungenHeute} hinweis="Heute abgeschlossen" />
      <Karte titel="Sendungen" wert={daten.heute.sendungenHeute} hinweis="Heute versendet" />
      <Karte titel="Aktive Sitzungen" wert={daten.system.aktiveSitzungen} hinweis={`${daten.system.aktiveBenutzer} aktive Benutzerkonten`} />
    </section><h2 className="mb-4 mt-8 text-xl font-semibold">Offene Prozesse</h2><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Karte titel="MDE-Vorgänge" wert={daten.offen.offeneMdeVorgaenge} hinweis="Noch nicht bestätigt" />
      <Karte titel="Prüfaufträge" wert={daten.offen.offenePruefauftraege} hinweis="Offen oder Freigabe ausstehend" />
      <Karte titel="Kommissionierungen" wert={daten.offen.offeneKommissionierungen} hinweis="Offen oder in Arbeit" />
      <Karte titel="Versandbereit" wert={daten.offen.versandbereit} hinweis="Sendungen warten auf Bestätigung" />
    </section><section className="mt-8 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-6"><h2 className="text-xl font-semibold">Teamstruktur</h2>
      <p className="mt-1 text-sm text-[var(--nova-text-schwaecher)]">Nur Anzahl aktiver Konten je Abteilung</p><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {daten.abteilungen.map((a) => <div key={a.name} className="flex justify-between rounded-xl border border-[var(--nova-rand)] px-4 py-3"><span>{a.name}</span><strong>{a.aktiveBenutzer}</strong></div>)}</div></section>
      <p className="mt-4 text-right text-xs text-[var(--nova-text-schwaecher)]">Automatische Aktualisierung alle 30 Sekunden · Stand {new Date(daten.aktualisiertAm).toLocaleTimeString("de-DE")}</p></>}
  </div></main>;
}
