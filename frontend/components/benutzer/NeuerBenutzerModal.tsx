"use client";

import type { Abteilung, Rolle } from "@/types/benutzer";

type RollenEintrag = {
  value: Rolle;
  label: string;
};

type NeuerBenutzerModalProps = {
  offen: boolean;

  vorname: string;
  nachname: string;
  personalnummer: string;
  passwort: string;

  abteilung: Abteilung;
  rolle: Rolle;

  abteilungen: Abteilung[];
  rollen: RollenEintrag[];

  onVornameAendern: (wert: string) => void;
  onNachnameAendern: (wert: string) => void;
  onPersonalnummerAendern: (wert: string) => void;
  onPasswortAendern: (wert: string) => void;
  onAbteilungAendern: (wert: Abteilung) => void;
  onRolleAendern: (wert: Rolle) => void;

  onSchliessen: () => void;
  onSpeichern: (
    event: React.FormEvent<HTMLFormElement>,
  ) => void;
};

export default function NeuerBenutzerModal({
  offen,
  vorname,
  nachname,
  personalnummer,
  passwort,
  abteilung,
  rolle,
  abteilungen,
  rollen,
  onVornameAendern,
  onNachnameAendern,
  onPersonalnummerAendern,
  onPasswortAendern,
  onAbteilungAendern,
  onRolleAendern,
  onSchliessen,
  onSpeichern,
}: NeuerBenutzerModalProps) {
  if (!offen) {
    return null;
  }

  return (
    <section className="mb-6 rounded-2xl border border-cyan-500/30 bg-slate-900 p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">
            Neuen Benutzer anlegen
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Zugangsdaten und Stammdaten des Mitarbeiters erfassen.
          </p>
        </div>

        <button
          type="button"
          onClick={onSchliessen}
          className="rounded-lg px-3 py-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
        >
          ✕
        </button>
      </div>

      <form
        onSubmit={onSpeichern}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      >
        <div>
          <label className="mb-2 block text-sm text-slate-400">
            Vorname
          </label>

          <input
            value={vorname}
            onChange={(event) =>
              onVornameAendern(event.target.value)
            }
            placeholder="Vorname"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-500"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-400">
            Nachname
          </label>

          <input
            value={nachname}
            onChange={(event) =>
              onNachnameAendern(event.target.value)
            }
            placeholder="Nachname"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-500"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-400">
            Personalnummer
          </label>

          <input
            value={personalnummer}
            readOnly
            placeholder="Wird automatisch vergeben"
            className="w-full cursor-not-allowed rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-slate-400 outline-none"
          />
          <p className="mt-2 text-xs text-slate-500">NOVA verwendet automatisch die nächste freie Personalnummer.</p>
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-400">
            Passwort
          </label>

          <input
            type="password"
            value={passwort}
            onChange={(event) =>
              onPasswortAendern(event.target.value)
            }
            placeholder="Mindestens 8 Zeichen"
            autoComplete="new-password"
            minLength={4}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-500"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-400">
            Abteilung
          </label>

          <select
            value={abteilung}
            onChange={(event) =>
              onAbteilungAendern(
                event.target.value as Abteilung,
              )
            }
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-500"
          >
            {abteilungen.map((eintrag) => (
              <option key={eintrag} value={eintrag}>
                {eintrag}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-400">
            Rolle
          </label>

          <select
            value={rolle}
            onChange={(event) =>
              onRolleAendern(event.target.value as Rolle)
            }
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-500"
          >
            {rollen.map((eintrag) => (
              <option
                key={eintrag.value}
                value={eintrag.value}
              >
                {eintrag.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-800 pt-5 md:col-span-2 lg:col-span-3">
          <button
            type="button"
            onClick={onSchliessen}
            className="rounded-xl border border-slate-700 px-5 py-3 font-medium transition hover:bg-slate-800"
          >
            Abbrechen
          </button>

          <button
            type="submit"
            className="rounded-xl bg-cyan-600 px-5 py-3 font-semibold transition hover:bg-cyan-500"
          >
            Benutzer speichern
          </button>
        </div>
      </form>
    </section>
  );
}
