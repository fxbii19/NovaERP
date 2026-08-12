"use client";
import { useCallback, useEffect, useState } from "react";
import { FileClock, RefreshCw, Search } from "lucide-react";
type Eintrag = {
  id: number;
  modul: string;
  aktion: string;
  details: string | null;
  benutzer: string | null;
  objektTyp: string | null;
  objektId: string | null;
  alterWert: string | null;
  neuerWert: string | null;
  grund: string | null;
  erstelltAm: string;
};
type Daten = { eintraege: Eintrag[]; module: string[]; aktualisiertAm: string };
export default function AuditTrail() {
  const [daten, setDaten] = useState<Daten | null>(null),
    [q, setQ] = useState(""),
    [modul, setModul] = useState(""),
    [fehler, setFehler] = useState(""),
    [laedt, setLaedt] = useState(false);
  const laden = useCallback(async () => {
    setLaedt(true);
    try {
      const p = new URLSearchParams();
      if (q) p.set("q", q);
      if (modul) p.set("modul", modul);
      const r = await fetch(`/api/audit-trail?${p}`, { cache: "no-store" }),
        j = await r.json();
      if (!r.ok) throw new Error(j.fehler);
      setDaten(j);
      setFehler("");
    } catch (e) {
      setFehler(
        e instanceof Error
          ? e.message
          : "Audit Trail konnte nicht geladen werden.",
      );
    } finally {
      setLaedt(false);
    }
  }, [q, modul]);
  useEffect(() => {
    const t = setTimeout(() => void laden(), 250);
    return () => clearTimeout(t);
  }, [laden]);
  return (
    <main className="min-h-screen bg-[var(--nova-hintergrund)] p-6 pl-24 text-[var(--nova-text)] xl:p-8 xl:pl-28">
      <div className="mx-auto w-full max-w-[1800px]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.24em] text-[var(--nova-akzent)]">
              Sicherheit · Administration
            </p>
            <h1 className="mt-1 flex items-center gap-3 text-4xl font-bold">
              <FileClock />
              Audit Trail
            </h1>
            <p className="mt-2 text-[var(--nova-text-schwaecher)]">
              Nachvollziehbare Historie aller wichtigen Änderungen.
            </p>
          </div>
          <button
            onClick={() => void laden()}
            className="flex items-center gap-2 rounded-xl bg-[var(--nova-akzent)] px-5 py-3 font-bold text-white hover:brightness-110"
          >
            <RefreshCw size={18} className={laedt ? "animate-spin" : ""} />
            Aktualisieren
          </button>
        </header>
        <section className="mt-8 flex flex-wrap gap-3 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-4">
          <label className="flex min-w-72 flex-1 items-center gap-3 rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-4">
            <Search size={17} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Benutzer, Aktion, Objekt oder Details suchen..."
              className="w-full bg-transparent py-3 outline-none"
            />
          </label>
          <select
            value={modul}
            onChange={(e) => setModul(e.target.value)}
            className="rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-4"
          >
            <option value="">Alle Module</option>
            {daten?.module.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </section>
        {fehler && (
          <p className="mt-5 rounded-xl bg-red-500/10 p-4 text-red-300">
            {fehler}
          </p>
        )}
        <section className="mt-5 overflow-hidden rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)]">
          <div>
            <table className="w-full table-fixed text-xs xl:text-sm">
              <thead className="bg-[var(--nova-hintergrund)]">
                <tr>
                  {[
                    "Wann?",
                    "Wer?",
                    "Was?",
                    "Objekt",
                    "Alter Wert",
                    "Neuer Wert",
                    "Grund",
                  ].map((x) => (
                    <th
                      key={x}
                      className="border-b border-[var(--nova-rand)] p-2 text-left xl:p-4"
                    >
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {daten?.eintraege.map((e) => (
                  <tr
                    key={e.id}
                    className="hover:bg-[var(--nova-flaeche-hover)]"
                  >
                    <td className="w-[12%] border-b border-[var(--nova-rand)] p-2 align-top xl:p-4">
                      {new Date(e.erstelltAm).toLocaleString("de-DE")}
                    </td>
                    <td className="w-[11%] break-words border-b border-[var(--nova-rand)] p-2 align-top font-semibold xl:p-4">
                      {e.benutzer ?? "System"}
                    </td>
                    <td className="w-[21%] break-words border-b border-[var(--nova-rand)] p-2 align-top xl:p-4">
                      <b>{e.aktion}</b>
                      <p className="text-xs text-[var(--nova-text-schwaecher)]">
                        {e.modul}
                        {e.details ? ` · ${e.details}` : ""}
                      </p>
                    </td>
                    <td className="w-[10%] break-words border-b border-[var(--nova-rand)] p-2 align-top xl:p-4">
                      {e.objektTyp ?? "–"}
                      {e.objektId ? ` #${e.objektId}` : ""}
                    </td>
                    <Wert wert={e.alterWert} />
                    <Wert wert={e.neuerWert} />
                    <td className="w-[14%] break-words border-b border-[var(--nova-rand)] p-2 align-top xl:p-4">
                      {e.grund ?? "Bestehender Protokolleintrag"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {daten && !daten.eintraege.length && (
            <p className="p-10 text-center text-[var(--nova-text-schwaecher)]">
              Keine passenden Änderungen gefunden.
            </p>
          )}
        </section>
        {daten && (
          <p className="mt-4 text-right text-xs text-[var(--nova-text-schwaecher)]">
            {daten.eintraege.length} Einträge · Stand{" "}
            {new Date(daten.aktualisiertAm).toLocaleTimeString("de-DE")}
          </p>
        )}
      </div>
    </main>
  );
}
function Wert({ wert }: { wert: string | null }) {
  let ausgabe = wert ?? "–";
  if (wert) {
    try {
      const o = JSON.parse(wert);
      ausgabe =
        typeof o === "object"
          ? Object.entries(o)
              .map(([k, v]) => `${k}: ${String(v)}`)
              .join(", ")
          : String(o);
    } catch {}
  }
  return (
    <td title={ausgabe} className="w-[16%] break-words border-b border-[var(--nova-rand)] p-2 align-top font-mono text-[11px] xl:p-4 xl:text-xs">
      {ausgabe}
    </td>
  );
}
