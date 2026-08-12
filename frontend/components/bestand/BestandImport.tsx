"use client";

import { useState } from "react";
import { bestandAusExcelLesen } from "../../lib/bestandExcel";

type BestandImportProps = {
  rolle: string;
  onImportAbgeschlossen?: () => void | Promise<void>;
};

type ImportAntwort = {
  erfolg?: boolean;
  importiert?: number;
  uebersprungen?: number;
  fehler?: string;
};

export default function BestandImport({
  rolle,
  onImportAbgeschlossen,
}: BestandImportProps) {
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [meldung, setMeldung] = useState<string | null>(null);

  async function dateiImportieren(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const datei = event.target.files?.[0];

    if (!datei) {
      return;
    }

    const dateiname = datei.name.toLowerCase();

    const gueltigeEndung =
      dateiname.endsWith(".xlsx") ||
      dateiname.endsWith(".xls");

    if (!gueltigeEndung) {
      setFehler(
        "Bitte eine gültige Excel-Datei im Format .xlsx oder .xls auswählen.",
      );

      event.target.value = "";
      return;
    }

    try {
      setLaedt(true);
      setFehler(null);
      setMeldung(null);

      /*
       * Excel-Datei auslesen.
       */
      const importErgebnis =
        await bestandAusExcelLesen(datei);

      if (
        !importErgebnis.artikel ||
        importErgebnis.artikel.length === 0
      ) {
        throw new Error(
          "Die Excel-Datei enthält keine gültigen Artikel.",
        );
      }

      const bestaetigt = window.confirm(
        `Achtung: Der aktuelle Bestand wird vollständig gelöscht und durch ${importErgebnis.artikel.length.toLocaleString(
          "de-DE",
        )} Artikel aus „${datei.name}“ ersetzt. Möchtest du fortfahren?`,
      );

      if (!bestaetigt) {
        return;
      }

      /*
       * Ausgelesene Artikel an die Import-API senden.
       */
      const response = await fetch("/api/artikel/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          artikel: importErgebnis.artikel,
          ersetzen: true,
        }),
      });

      const antwort =
        (await response.json()) as ImportAntwort;

      if (!response.ok) {
        throw new Error(
          antwort.fehler ||
            "Die Artikel konnten nicht importiert werden.",
        );
      }

      const importiert = antwort.importiert ?? 0;
      const uebersprungen = antwort.uebersprungen ?? 0;

      setMeldung(
        `${importiert.toLocaleString(
          "de-DE",
        )} Artikel haben den bisherigen Bestand erfolgreich ersetzt${
          uebersprungen > 0
            ? `. ${uebersprungen.toLocaleString(
                "de-DE",
              )} Datensätze wurden übersprungen`
            : ""
        }.`,
      );

      /*
       * Danach die Bestandstabelle neu laden.
       */
      await onImportAbgeschlossen?.();
    } catch (error) {
      console.error("Fehler beim Excel-Import:", error);

      setFehler(
        error instanceof Error
          ? error.message
          : "Die Excel-Datei konnte nicht importiert werden.",
      );
    } finally {
      setLaedt(false);
      event.target.value = "";
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Excel-Import
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Ersetzt den aktuellen Bestand vollständig durch eine
            Excel-Datei. Vorher ist eine Bestätigung erforderlich.
          </p>
        </div>

        <label
          className={`inline-flex items-center justify-center rounded-xl px-5 py-3 font-medium transition ${
            laedt
              ? "cursor-not-allowed bg-slate-700 text-slate-400"
              : "cursor-pointer bg-[var(--nova-akzent)] text-white hover:brightness-110"
          }`}
        >
          {laedt
            ? "Import wird durchgeführt..."
            : "Excel auswählen und Bestand ersetzen"}

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={dateiImportieren}
            disabled={laedt}
            className="hidden"
          />
        </label>
      </div>

      {fehler && (
        <div className="mt-5 rounded-xl border border-red-900 bg-red-950/50 p-4 text-sm text-red-300">
          {fehler}
        </div>
      )}

      {meldung && (
        <div className="mt-5 rounded-xl border border-emerald-900 bg-emerald-950/50 p-4 text-sm text-emerald-300">
          {meldung}
        </div>
      )}
    </section>
  );
}
