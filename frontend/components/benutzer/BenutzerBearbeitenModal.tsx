"use client";

import type {
  Abteilung,
  Rolle,
} from "@/types/benutzer";

type RollenEintrag = {
  value: Rolle;
  label: string;
};

type BenutzerBearbeitenModalProps = {
  offen: boolean;
  benutzerId: number | null;

  vorname: string;
  nachname: string;
  personalnummer: string;
  passwort: string;
  abteilung: Abteilung;
  rolle: Rolle;
  aktiv: boolean;

  abteilungen: Abteilung[];
  rollen: RollenEintrag[];

  onVornameAendern: (wert: string) => void;
  onNachnameAendern: (wert: string) => void;
  onPersonalnummerAendern: (wert: string) => void;
  onPasswortAendern: (wert: string) => void;
  onAbteilungAendern: (wert: Abteilung) => void;
  onRolleAendern: (wert: Rolle) => void;
  onAktivAendern: (wert: boolean) => void;

  onAbbrechen: () => void;
  onSpeichern: (
    event: React.FormEvent<HTMLFormElement>,
  ) => void;
};

export default function BenutzerBearbeitenModal({
  offen,
  benutzerId,
  vorname,
  nachname,
  personalnummer,
  passwort,
  abteilung,
  rolle,
  aktiv,
  abteilungen,
  rollen,
  onVornameAendern,
  onNachnameAendern,
  onPersonalnummerAendern,
  onPasswortAendern,
  onAbteilungAendern,
  onRolleAendern,
  onAktivAendern,
  onAbbrechen,
  onSpeichern,
}: BenutzerBearbeitenModalProps) {
  if (!offen || benutzerId === null) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
          <div>
            <h2 className="text-2xl font-bold">
              Mitarbeiter bearbeiten
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Stammdaten, Passwort, Abteilung und Rolle ändern
            </p>
          </div>

          <button
            type="button"
            onClick={onAbbrechen}
            className="rounded-lg px-3 py-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={onSpeichern}
          className="p-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-slate-400">
                Vorname
              </label>

              <input
                value={vorname}
                onChange={(event) =>
                  onVornameAendern(event.target.value)
                }
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
                onChange={(event) =>
                  onPersonalnummerAendern(
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">
                Neues Passwort (optional)
              </label>

              <input
                type="password"
                value={passwort}
                onChange={(event) =>
                  onPasswortAendern(event.target.value)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-500"
                autoComplete="new-password"
                minLength={4}
                placeholder="Leer lassen, um es beizubehalten"
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
                  <option
                    key={eintrag}
                    value={eintrag}
                  >
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
                  onRolleAendern(
                    event.target.value as Rolle,
                  )
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

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-slate-400">
                Benutzerstatus
              </label>

              <label className="flex h-[50px] cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 px-4">
                <input
                  type="checkbox"
                  checked={aktiv}
                  onChange={(event) =>
                    onAktivAendern(
                      event.target.checked,
                    )
                  }
                  className="h-4 w-4 accent-cyan-500"
                />

                <span>Benutzer ist aktiv</span>
              </label>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-800 pt-5">
            <button
              type="button"
              onClick={onAbbrechen}
              className="rounded-xl border border-slate-700 px-5 py-3 font-medium transition hover:bg-slate-800"
            >
              Abbrechen
            </button>

            <button
              type="submit"
              className="rounded-xl bg-cyan-600 px-5 py-3 font-semibold transition hover:bg-cyan-500"
            >
              Änderungen speichern
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
