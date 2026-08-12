"use client";

import type { NovaUser, Rolle } from "@/types/benutzer";

type BenutzerTabelleProps = {
  benutzer: NovaUser[];
  onBearbeiten: (benutzer: NovaUser) => void;
  onStatusWechseln: (id: number) => void;
  onLoeschen: (benutzer: NovaUser) => void;
};

const ROLLEN_NAMEN: Record<Rolle, string> = {
  ADMIN: "Administrator",
  MITARBEITER: "Mitarbeiter",
  TEAMLEITER: "Teamleiter",
  SACHBEARBEITER: "Sachbearbeiter",
};

export default function BenutzerTabelle({
  benutzer,
  onBearbeiten,
  onStatusWechseln,
  onLoeschen,
}: BenutzerTabelleProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left">
          <thead className="border-b border-slate-800 bg-slate-950/60 text-sm text-slate-400">
            <tr>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Mitarbeiter</th>
              <th className="px-5 py-4">Personalnummer</th>
              <th className="px-5 py-4">Abteilung</th>
              <th className="px-5 py-4">Rolle</th>
              <th className="px-5 py-4">Aktionen</th>
            </tr>
          </thead>

          <tbody>
            {benutzer.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-12 text-center text-slate-400"
                >
                  Keine passenden Benutzer gefunden.
                </td>
              </tr>
            ) : (
              benutzer.map((eintrag) => (
                <tr
                  key={eintrag.id}
                  className="border-b border-slate-800 last:border-b-0 hover:bg-slate-800/40"
                >
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        eintrag.aktiv
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-red-500/15 text-red-400"
                      }`}
                    >
                      {eintrag.aktiv ? "Aktiv" : "Gesperrt"}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/15 font-bold text-cyan-400">
                        {eintrag.vorname.charAt(0).toUpperCase()}
                        {eintrag.nachname.charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <p className="font-medium">
                          {eintrag.vorname} {eintrag.nachname}
                        </p>

                        <p className="text-xs text-slate-500">
                          Benutzer-ID: {eintrag.id}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-slate-300">
                    {eintrag.personalnummer}
                  </td>

                  <td className="px-5 py-4 text-slate-300">
                    {eintrag.abteilung}
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-lg bg-cyan-500/10 px-3 py-1 text-sm text-cyan-400">
                      {ROLLEN_NAMEN[eintrag.rolle]}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onBearbeiten(eintrag)}
                        className="rounded-lg border border-cyan-700 px-3 py-2 text-sm text-cyan-400 transition hover:bg-cyan-500/10"
                      >
                        Bearbeiten
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onStatusWechseln(eintrag.id)
                        }
                        className="rounded-lg border border-slate-700 px-3 py-2 text-sm transition hover:bg-slate-800"
                      >
                        {eintrag.aktiv
                          ? "Sperren"
                          : "Aktivieren"}
                      </button>

                      <button
                        type="button"
                        onClick={() => onLoeschen(eintrag)}
                        className="rounded-lg border border-red-900 px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
                      >
                        Löschen
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}