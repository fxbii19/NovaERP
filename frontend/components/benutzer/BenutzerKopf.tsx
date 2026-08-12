"use client";

import Link from "next/link";

type BenutzerKopfProps = {
  onNeuerBenutzer: () => void;
};

export default function BenutzerKopf({
  onNeuerBenutzer,
}: BenutzerKopfProps) {
  return (
    <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <Link
          href="/"
          className="text-sm text-cyan-400 transition hover:text-cyan-300"
        >
          ← Zurück zum Dashboard
        </Link>

        <h1 className="mt-3 text-3xl font-bold">
          Benutzerverwaltung
        </h1>

        <p className="mt-2 text-slate-400">
          Mitarbeiter, Abteilungen und Rollen verwalten
        </p>
      </div>

      <button
        type="button"
        onClick={onNeuerBenutzer}
        className="rounded-xl bg-cyan-600 px-5 py-3 font-semibold transition hover:bg-cyan-500"
      >
        + Neuer Benutzer
      </button>
    </header>
  );
}