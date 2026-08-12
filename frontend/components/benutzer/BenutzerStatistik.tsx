import type { NovaUser } from "@/types/benutzer";

type BenutzerStatistikProps = {
  benutzer: NovaUser[];
};

export default function BenutzerStatistik({
  benutzer,
}: BenutzerStatistikProps) {
  const aktiveBenutzer = benutzer.filter(
    (eintrag) => eintrag.aktiv,
  ).length;

  const anzahlAbteilungen = new Set(
    benutzer.map((eintrag) => eintrag.abteilung),
  ).size;

  return (
    <section className="mb-6 grid gap-4 md:grid-cols-3">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-sm text-slate-400">
          Benutzer insgesamt
        </p>

        <p className="mt-2 text-3xl font-bold">
          {benutzer.length}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-sm text-slate-400">
          Aktive Benutzer
        </p>

        <p className="mt-2 text-3xl font-bold text-emerald-400">
          {aktiveBenutzer}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-sm text-slate-400">
          Abteilungen
        </p>

        <p className="mt-2 text-3xl font-bold text-cyan-400">
          {anzahlAbteilungen}
        </p>
      </div>
    </section>
  );
}