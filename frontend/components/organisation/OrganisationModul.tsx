"use client";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import useLiveUpdates from "@/hooks/useLiveUpdates";

export type OrganisationsModus =
  | "unternehmen"
  | "persoenlich"
  | "termine"
  | "besprechungen"
  | "urlaub"
  | "ressourcen";
type Person = {
  id: number;
  vorname: string;
  nachname: string;
  personalnummer: string;
  abteilung: string;
};
type Termin = {
  id: number;
  titel: string;
  beschreibung: string | null;
  typ: string;
  sichtbarkeit: string;
  startAm: string;
  endeAm: string;
  ort: string | null;
  organisiertVon: string;
  status: string;
};
type Urlaub = {
  id: number;
  mitarbeiter: string;
  von: string;
  bis: string;
  status: string;
  notiz: string | null;
};
type Ressource = {
  id: number;
  name: string;
  kategorie: string;
  standort: string | null;
  beschreibung: string | null;
};
type Reservierung = {
  id: number;
  titel: string;
  startAm: string;
  endeAm: string;
  gebuchtVon: string;
  status: string;
  ressource: Ressource;
};
type Daten = {
  erweitert: boolean;
  termine: Termin[];
  eigeneTermine: Termin[];
  abwesenheiten: Urlaub[];
  ressourcen: Ressource[];
  reservierungen: Reservierung[];
  benutzer: Person[];
  aktualisiertAm: string;
};
const nav = [
  ["unternehmen", "Unternehmenskalender", "/organisation"],
  ["persoenlich", "Persönlicher Kalender", "/organisation/persoenlich"],
  ["termine", "Terminplanung", "/organisation/termine"],
  ["besprechungen", "Besprechungen", "/organisation/besprechungen"],
  ["urlaub", "Urlaubsplanung", "/organisation/urlaub"],
  ["ressourcen", "Ressourcenplanung", "/organisation/ressourcen"],
] as const;
const card =
  "rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5";
const input =
  "rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-3 py-2.5 outline-none focus:border-[var(--nova-akzent)]";
const btn =
  "rounded-xl bg-[var(--nova-akzent)] px-4 py-2.5 font-semibold text-white transition hover:brightness-110 disabled:opacity-50";
const fmt = (v: string) =>
  new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(v));
const tag = (v: string) =>
  new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(new Date(v));

export default function OrganisationModul({
  modus,
}: {
  modus: OrganisationsModus;
}) {
  const [daten, setDaten] = useState<Daten | null>(null),
    [fehler, setFehler] = useState(""),
    [meldung, setMeldung] = useState(""),
    [sendet, setSendet] = useState(false);
  const laden = useCallback(async () => {
    try {
      const r = await fetch("/api/organisation", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.fehler);
      setDaten(j);
      setFehler("");
    } catch (e) {
      setFehler(
        e instanceof Error ? e.message : "Daten konnten nicht geladen werden.",
      );
    }
  }, []);
  useEffect(() => {
    void laden();
  }, [laden]);
  useLiveUpdates(() => void laden());
  async function senden(payload: Record<string, unknown>) {
    setSendet(true);
    setMeldung("");
    try {
      const r = await fetch("/api/organisation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.fehler);
      setMeldung("Änderung wurde gespeichert.");
      await laden();
      return true;
    } catch (e) {
      setMeldung(e instanceof Error ? e.message : "Aktion fehlgeschlagen.");
      return false;
    } finally {
      setSendet(false);
    }
  }
  const quelle =
    modus === "persoenlich" ? daten?.eigeneTermine : daten?.termine;
  const termine = useMemo(
    () =>
      quelle?.filter(
        (t) => modus !== "besprechungen" || t.typ === "BESPRECHUNG",
      ) ?? [],
    [quelle, modus],
  );
  return (
    <main className="min-h-screen bg-[var(--nova-hintergrund)] px-8 py-8 text-[var(--nova-text)]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7">
          <p className="text-sm font-bold uppercase tracking-[.25em] text-[var(--nova-akzent)]">
            Organisation
          </p>
          <h1 className="mt-1 text-4xl font-bold">Kalender & Planung</h1>
          <p className="mt-2 text-[var(--nova-text-schwaecher)]">
            Termine, Urlaub und Ressourcen zentral koordinieren.
          </p>
        </div>
        <nav className="mb-7 flex gap-2 overflow-x-auto pb-2">
          {nav.map(([id, n, h]) => (
            <Link
              key={id}
              href={h}
              className={`whitespace-nowrap rounded-xl border px-4 py-2.5 ${modus === id ? "border-[var(--nova-akzent)] bg-[var(--nova-akzent)] text-white" : "border-[var(--nova-rand)] bg-[var(--nova-flaeche)] hover:border-[var(--nova-akzent)]"}`}
            >
              {n}
            </Link>
          ))}
        </nav>
        {fehler && (
          <p className="mb-4 rounded-xl bg-red-500/10 p-4 text-red-300">
            {fehler}
          </p>
        )}
        {meldung && (
          <p className="mb-4 rounded-xl bg-[var(--nova-akzent-transparent)] p-4">
            {meldung}
          </p>
        )}
        {!daten ? (
          <div className={card}>Kalender wird geladen…</div>
        ) : (
          <>
            {(modus === "unternehmen" || modus === "persoenlich") && (
              <Kalender
                termine={termine}
                titel={
                  modus === "unternehmen"
                    ? "Unternehmenskalender"
                    : "Mein Kalender"
                }
              />
            )}
            {(modus === "termine" || modus === "besprechungen") && (
              <>
                <TerminForm
                  daten={daten}
                  typ={modus === "besprechungen" ? "BESPRECHUNG" : "TERMIN"}
                  senden={senden}
                  sendet={sendet}
                />
                <div className="mt-5">
                  <TerminListe termine={termine} />
                </div>
              </>
            )}
            {modus === "urlaub" && (
              <Urlaub daten={daten} senden={senden} sendet={sendet} />
            )}{" "}
            {modus === "ressourcen" && (
              <Ressourcen daten={daten} senden={senden} sendet={sendet} />
            )}
            <p className="mt-4 text-right text-xs text-[var(--nova-text-schwaecher)]">
              Stand: {fmt(daten.aktualisiertAm)}
            </p>
          </>
        )}
      </div>
    </main>
  );
}
function Kalender({ termine, titel }: { termine: Termin[]; titel: string }) {
  const gruppen = termine.reduce<Record<string, Termin[]>>((a, t) => {
    const k = t.startAm.slice(0, 10);
    (a[k] ??= []).push(t);
    return a;
  }, {});
  return (
    <section className={card}>
      <h2 className="text-xl font-bold">{titel}</h2>
      <div className="mt-5 space-y-4">
        {Object.entries(gruppen).map(([d, ts]) => (
          <div key={d} className="grid gap-3 md:grid-cols-[180px_1fr]">
            <p className="font-semibold text-[var(--nova-akzent)]">
              {tag(d + "T12:00:00")}
            </p>
            <div className="space-y-2">
              {ts.map((t) => (
                <TerminZeile key={t.id} t={t} />
              ))}
            </div>
          </div>
        ))}
        {termine.length === 0 && <Leer text="Keine anstehenden Termine." />}
      </div>
    </section>
  );
}
function TerminListe({ termine }: { termine: Termin[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {termine.map((t) => (
        <TerminZeile key={t.id} t={t} />
      ))}
      {termine.length === 0 && <Leer text="Keine Termine vorhanden." />}
    </div>
  );
}
function TerminZeile({ t }: { t: Termin }) {
  return (
    <article className={`${card} !p-4`}>
      <div className="flex justify-between gap-3">
        <div>
          <p className="font-bold">{t.titel}</p>
          <p className="mt-1 text-sm text-[var(--nova-text-schwaecher)]">
            {fmt(t.startAm)} –{" "}
            {new Date(t.endeAm).toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {t.ort ? ` · ${t.ort}` : ""}
          </p>
        </div>
        <span className="h-fit rounded-full bg-[var(--nova-akzent-transparent)] px-2 py-1 text-xs text-[var(--nova-akzent)]">
          {t.typ}
        </span>
      </div>
      {t.beschreibung && <p className="mt-3 text-sm">{t.beschreibung}</p>}
      <p className="mt-2 text-xs text-[var(--nova-text-schwaecher)]">
        Organisiert von {t.organisiertVon} · {t.status}
      </p>
    </article>
  );
}
function TerminForm({
  daten,
  typ,
  senden,
  sendet,
}: {
  daten: Daten;
  typ: string;
  senden: (p: Record<string, unknown>) => Promise<boolean>;
  sendet: boolean;
}) {
  async function sub(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (
      await senden({
        aktion: "termin-anlegen",
        typ,
        titel: f.get("titel"),
        beschreibung: f.get("beschreibung"),
        startAm: f.get("startAm"),
        endeAm: f.get("endeAm"),
        ort: f.get("ort"),
        sichtbarkeit: f.get("sichtbarkeit"),
        teilnehmerIds: f.getAll("teilnehmerIds"),
      })
    )
      e.currentTarget.reset();
  }
  return (
    <form
      onSubmit={sub}
      className={`${card} grid gap-3 md:grid-cols-2 xl:grid-cols-4`}
    >
      <input
        required
        name="titel"
        placeholder={
          typ === "BESPRECHUNG" ? "Besprechungstitel" : "Termintitel"
        }
        className={input}
      />
      <input name="ort" placeholder="Ort / Raum" className={input} />
      <input required type="datetime-local" name="startAm" className={input} />
      <input required type="datetime-local" name="endeAm" className={input} />
      <input
        name="beschreibung"
        placeholder="Beschreibung"
        className={`${input} md:col-span-2`}
      />
      <select
        name="teilnehmerIds"
        multiple
        className={`${input} min-h-24`}
        title="Mehrfachauswahl mit Strg"
      >
        <option disabled>Teilnehmer wählen</option>
        {daten.benutzer.map((p) => (
          <option key={p.id} value={p.id}>
            {p.vorname} {p.nachname}
          </option>
        ))}
      </select>
      <div className="flex items-end gap-2">
        <select name="sichtbarkeit" className={`${input} min-w-0 flex-1`}>
          <option value="PERSOENLICH">Persönlich</option>
          {daten.erweitert && <option value="UNTERNEHMEN">Unternehmen</option>}
        </select>
        <button disabled={sendet} className={btn}>
          Speichern
        </button>
      </div>
    </form>
  );
}
function Urlaub({
  daten,
  senden,
  sendet,
}: {
  daten: Daten;
  senden: (p: Record<string, unknown>) => Promise<boolean>;
  sendet: boolean;
}) {
  const [ausgewaehlt, setAusgewaehlt] = useState<Urlaub | null>(null);

  async function sub(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (
      await senden({
        aktion: "urlaub-antragen",
        von: f.get("von"),
        bis: f.get("bis"),
        notiz: f.get("notiz"),
      })
    )
      e.currentTarget.reset();
  }
  return (
    <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <form onSubmit={sub} className={`${card} space-y-3`}>
        <h2 className="text-xl font-bold">Urlaub beantragen</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input required type="date" name="von" className={input} />
          <input required type="date" name="bis" className={input} />
        </div>
        <input
          name="notiz"
          placeholder="Notiz (optional)"
          className={`${input} w-full`}
        />
        <button disabled={sendet} className={`${btn} w-full`}>
          Antrag senden
        </button>
      </form>
      <section className={card}>
        <h2 className="text-xl font-bold">Urlaubsplanung</h2>
        <div className="mt-4 space-y-3">
          {daten.abwesenheiten.map((u) => (
            <div
              key={u.id}
              role="button"
              tabIndex={0}
              onClick={() => setAusgewaehlt(u)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setAusgewaehlt(u);
                }
              }}
              className={`flex cursor-pointer flex-wrap items-center gap-3 rounded-xl border p-4 transition hover:border-[var(--nova-akzent)] hover:bg-[var(--nova-flaeche-hover)] ${
                ausgewaehlt?.id === u.id
                  ? "border-[var(--nova-akzent)] bg-[var(--nova-akzent-transparent)]"
                  : "border-[var(--nova-rand)]"
              }`}
            >
              <div className="mr-auto">
                <p className="font-semibold">{u.mitarbeiter}</p>
                <p className="text-sm text-[var(--nova-text-schwaecher)]">
                  {tag(u.von)} – {tag(u.bis)}
                </p>
              </div>
              <span>{u.status}</span>
              {daten.erweitert && u.status === "BEANTRAGT" && (
                <>
                  <button
                    className={btn}
                    onClick={(event) => {
                      event.stopPropagation();
                      void senden({
                        aktion: "urlaub-status",
                        id: u.id,
                        status: "GENEHMIGT",
                      });
                    }}
                  >
                    Genehmigen
                  </button>
                  <button
                    className="rounded-xl border border-red-500 px-4 py-2 text-red-300"
                    onClick={(event) => {
                      event.stopPropagation();
                      void senden({
                        aktion: "urlaub-status",
                        id: u.id,
                        status: "ABGELEHNT",
                      });
                    }}
                  >
                    Ablehnen
                  </button>
                </>
              )}
              {daten.erweitert && u.status === "GENEHMIGT" && (
                <button
                  disabled={sendet}
                  className="rounded-xl border border-red-500 px-4 py-2 text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (
                      window.confirm(
                        `Möchtest du den bereits genehmigten Urlaub von ${u.mitarbeiter} nachträglich ablehnen?`,
                      )
                    ) {
                      void senden({
                        aktion: "urlaub-status",
                        id: u.id,
                        status: "ABGELEHNT",
                      });
                    }
                  }}
                >
                  Nachträglich ablehnen
                </button>
              )}
            </div>
          ))}
          {daten.abwesenheiten.length === 0 && (
            <Leer text="Keine Urlaubsanträge vorhanden." />
          )}
        </div>
        {ausgewaehlt && (
          <div className="mt-5 rounded-2xl border border-[var(--nova-akzent)] bg-[var(--nova-hintergrund)] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--nova-akzent)]">
                  Urlaubsantrag
                </p>
                <h3 className="mt-1 text-xl font-bold">
                  {ausgewaehlt.mitarbeiter}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAusgewaehlt(null)}
                className="rounded-lg border border-[var(--nova-rand)] px-3 py-1.5 text-sm transition hover:border-[var(--nova-akzent)]"
              >
                Schließen
              </button>
            </div>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-[var(--nova-text-schwaecher)]">
                  Zeitraum
                </dt>
                <dd className="mt-1 font-semibold">
                  {tag(ausgewaehlt.von)} – {tag(ausgewaehlt.bis)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--nova-text-schwaecher)]">
                  Status
                </dt>
                <dd className="mt-1 font-semibold">{ausgewaehlt.status}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-[var(--nova-text-schwaecher)]">
                  Notiz
                </dt>
                <dd className="mt-2 min-h-16 whitespace-pre-wrap rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-3">
                  {ausgewaehlt.notiz?.trim() || "Keine Notiz hinterlegt."}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </section>
    </div>
  );
}
function Ressourcen({
  daten,
  senden,
  sendet,
}: {
  daten: Daten;
  senden: (p: Record<string, unknown>) => Promise<boolean>;
  sendet: boolean;
}) {
  async function sub(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (
      await senden({
        aktion: "ressource-reservieren",
        ressourceId: Number(f.get("ressourceId")),
        titel: f.get("titel"),
        startAm: f.get("startAm"),
        endeAm: f.get("endeAm"),
        notiz: f.get("notiz"),
      })
    )
      e.currentTarget.reset();
  }
  return (
    <div className="space-y-5">
      <form
        onSubmit={sub}
        className={`${card} grid gap-3 md:grid-cols-2 xl:grid-cols-5`}
      >
        <select required name="ressourceId" className={input}>
          <option value="">Ressource wählen</option>
          {daten.ressourcen.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <input required name="titel" placeholder="Anlass" className={input} />
        <input
          required
          type="datetime-local"
          name="startAm"
          className={input}
        />
        <input required type="datetime-local" name="endeAm" className={input} />
        <button disabled={sendet} className={btn}>
          Reservieren
        </button>
      </form>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {daten.ressourcen.map((r) => (
          <article key={r.id} className={card}>
            <p className="text-xs font-bold text-[var(--nova-akzent)]">
              {r.kategorie}
            </p>
            <h3 className="mt-1 text-lg font-bold">{r.name}</h3>
            <p className="text-sm text-[var(--nova-text-schwaecher)]">
              {r.standort}
            </p>
            {r.beschreibung && <p className="mt-2 text-sm">{r.beschreibung}</p>}
            <div className="mt-4 space-y-2">
              {daten.reservierungen
                .filter((x) => x.ressource.id === r.id)
                .slice(0, 4)
                .map((x) => (
                  <div
                    key={x.id}
                    className="rounded-lg bg-[var(--nova-hintergrund)] p-3 text-sm"
                  >
                    <b>{x.titel}</b>
                    <p className="text-[var(--nova-text-schwaecher)]">
                      {fmt(x.startAm)} · {x.gebuchtVon}
                    </p>
                  </div>
                ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
function Leer({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--nova-rand)] p-8 text-center text-[var(--nova-text-schwaecher)]">
      {text}
    </div>
  );
}
