"use client";

import type {
  Abteilung,
  Rolle,
} from "@/types/benutzer";

type RollenEintrag = {
  value: Rolle;
  label: string;
};

type BenutzerFilterProps = {
  suche: string;
  abteilungsFilter: Abteilung | "ALLE";
  rollenFilter: Rolle | "ALLE";
  nurAktive: boolean;

  abteilungen: Abteilung[];
  rollen: RollenEintrag[];

  angezeigteBenutzer: number;
  benutzerInsgesamt: number;

  onSucheAendern: (wert: string) => void;
  onAbteilungsFilterAendern: (
    wert: Abteilung | "ALLE",
  ) => void;
  onRollenFilterAendern: (
    wert: Rolle | "ALLE",
  ) => void;
  onNurAktiveAendern: (wert: boolean) => void;
  onZuruecksetzen: () => void;
};

export default function BenutzerFilter({
  suche,
  abteilungsFilter,
  rollenFilter,
  nurAktive,
  abteilungen,
  rollen,
  angezeigteBenutzer,
  benutzerInsgesamt,
  onSucheAendern,
  onAbteilungsFilterAendern,
  onRollenFilterAendern,
  onNurAktiveAendern,
  onZuruecksetzen,
}: BenutzerFilterProps) {
  return (
    <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <input
          value={suche}
          onChange={(event) =>
            onSucheAendern(event.target.value)
          }
          placeholder="Mitarbeiter suchen …"
          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-500"
        />

        <select
          value={abteilungsFilter}
          onChange={(event) =>
            onAbteilungsFilterAendern(
              event.target.value as
                | Abteilung
                | "ALLE",
            )
          }
          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-500"
        >
          <option value="ALLE">
            Alle Abteilungen
          </option>

          {abteilungen.map((eintrag) => (
            <option
              key={eintrag}
              value={eintrag}
            >
              {eintrag}
            </option>
          ))}
        </select>

        <select
          value={rollenFilter}
          onChange={(event) =>
            onRollenFilterAendern(
              event.target.value as
                | Rolle
                | "ALLE",
            )
          }
          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-500"
        >
          <option value="ALLE">
            Alle Rollen
          </option>

          {rollen.map((eintrag) => (
            <option
              key={eintrag.value}
              value={eintrag.value}
            >
              {eintrag.label}
            </option>
          ))}
        </select>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3">
          <input
            type="checkbox"
            checked={nurAktive}
            onChange={(event) =>
              onNurAktiveAendern(
                event.target.checked,
              )
            }
            className="h-4 w-4 accent-cyan-500"
          />

          <span className="text-sm text-slate-300">
            Nur aktive Benutzer
          </span>
        </label>

        <button
          type="button"
          onClick={onZuruecksetzen}
          className="rounded-xl border border-slate-700 px-4 py-3 font-medium transition hover:bg-slate-800"
        >
          Filter zurücksetzen
        </button>
      </div>

      <p className="mt-4 text-sm text-slate-400">
        {angezeigteBenutzer} von{" "}
        {benutzerInsgesamt} Benutzern angezeigt
      </p>
    </section>
  );
}