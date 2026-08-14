"use client";

import {
  FormEvent,
  Suspense,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";

import BestandImport from "../../components/bestand/BestandImport";
import BestandTabelle, {
  type DatenbankArtikel,
} from "../../components/bestand/BestandTabelle";
import NovaSidebar from "../../components/NovaSidebar";
import { useAuth } from "../../hooks/useAuth";

import NovaButton from "../../components/ui/NovaButton";
import NovaCard from "../../components/ui/NovaCard";

type NeuerArtikelFormular = {
  artikelnummer: string;
  produktname: string;
  suchbegriff: string;
  groesse: string;
  variante: string;
  bestand: string;
  reserviert: string;
  bestellt: string;
  inAuftrag: string;
  mindestbestand: string;
};

const leeresFormular: NeuerArtikelFormular = {
  artikelnummer: "",
  produktname: "",
  suchbegriff: "",
  groesse: "",
  variante: "",
  bestand: "0",
  reserviert: "0",
  bestellt: "0",
  inAuftrag: "0",
  mindestbestand: "0",
};

export default function BestandSeite() {
  return <Suspense fallback={<div className="p-8 text-[var(--nova-text-schwaecher)]">Bestand wird geladen...</div>}><BestandInhalt /></Suspense>;
}

function BestandInhalt() {
  const searchParams = useSearchParams();
  const initialerBestandsstatus = searchParams.get("filter") === "kritisch" ? "kritisch" : "alle";
  const [artikel, setArtikel] = useState<
    DatenbankArtikel[]
  >([]);

  const [modalGeoeffnet, setModalGeoeffnet] =
    useState(false);

  const [formular, setFormular] =
    useState<NeuerArtikelFormular>(leeresFormular);

  const [laedt, setLaedt] = useState(true);
  const [speichert, setSpeichert] = useState(false);

  const [fehler, setFehler] = useState<string | null>(
    null,
  );

  const [erfolg, setErfolg] = useState<string | null>(
    null,
  );

  const { user, istAdmin, geladen } = useAuth();

  const artikelLaden = useCallback(async () => {
    try {
      setLaedt(true);
      setFehler(null);

      const antwort = await fetch("/api/artikel", {
        method: "GET",
        cache: "no-store",
      });

      const daten = await antwort.json();

      if (!antwort.ok) {
        throw new Error(
          daten.fehler ??
            "Die Artikel konnten nicht geladen werden.",
        );
      }

      if (!Array.isArray(daten)) {
        throw new Error(
          "Die Artikeldaten haben ein ungültiges Format.",
        );
      }

      setArtikel(daten as DatenbankArtikel[]);
    } catch (error) {
      console.error(
        "Fehler beim Laden der Artikel:",
        error,
      );

      setFehler(
        error instanceof Error
          ? error.message
          : "Die Artikel konnten nicht geladen werden.",
      );
    } finally {
      setLaedt(false);
    }
  }, []);

  useEffect(() => {
    void artikelLaden();
  }, [artikelLaden]);

  function formularFeldAendern(
    feld: keyof NeuerArtikelFormular,
    wert: string,
  ) {
    setFormular((aktuellesFormular) => ({
      ...aktuellesFormular,
      [feld]: wert,
    }));
  }

  function modalOeffnen() {
    setFehler(null);
    setErfolg(null);
    setFormular(leeresFormular);
    setModalGeoeffnet(true);
  }

  function modalSchliessen() {
    if (speichert) {
      return;
    }

    setModalGeoeffnet(false);
    setFormular(leeresFormular);
    setFehler(null);
  }

  async function artikelAnlegen(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!istAdmin) {
      setFehler(
        "Nur Administratoren dürfen Artikel anlegen.",
      );
      return;
    }

    try {
      setSpeichert(true);
      setFehler(null);
      setErfolg(null);

      const bestand = Number(formular.bestand);
      const reserviert = Number(formular.reserviert);
      const bestellt = Number(formular.bestellt);
      const inAuftrag = Number(formular.inAuftrag);
      const mindestbestand = Number(
        formular.mindestbestand,
      );

      if (
        !Number.isFinite(bestand) ||
        !Number.isFinite(reserviert) ||
        !Number.isFinite(bestellt) ||
        !Number.isFinite(inAuftrag) ||
        !Number.isFinite(mindestbestand)
      ) {
        throw new Error(
          "Bitte gültige Zahlenwerte eingeben.",
        );
      }

      const verfuegbar = bestand - reserviert;

      const antwort = await fetch("/api/artikel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          artikelnummer:
            formular.artikelnummer.trim(),
          produktname: formular.produktname.trim(),
          suchbegriff: formular.suchbegriff.trim(),
          groesse: formular.groesse.trim(),
          variante: formular.variante.trim(),
          bestand,
          reserviert,
          verfuegbar,
          bestellt,
          inAuftrag,
          mindestbestand,
          lagerortverwaltung: true,
        }),
      });

      const daten = await antwort.json();

      if (!antwort.ok) {
        throw new Error(
          daten.fehler ??
            "Der Artikel konnte nicht angelegt werden.",
        );
      }

      setErfolg(
        `Artikel ${daten.artikelnummer} wurde angelegt.`,
      );

      setModalGeoeffnet(false);
      setFormular(leeresFormular);

      await artikelLaden();
    } catch (error) {
      console.error(
        "Fehler beim Anlegen des Artikels:",
        error,
      );

      setFehler(
        error instanceof Error
          ? error.message
          : "Der Artikel konnte nicht angelegt werden.",
      );
    } finally {
      setSpeichert(false);
    }
  }

  async function importAbgeschlossen() {

   await artikelLaden();
  }

  async function bestandExportieren() {
    const XLSX = await import("xlsx");
    const exportDaten = artikel.map((eintrag) => ({
      Artikelnummer: eintrag.artikelnummer,
      Produktname: eintrag.produktname,
      Suchbegriff: eintrag.suchbegriff ?? "",
      "Größe": eintrag.groesse ?? "",
      Variante: eintrag.variante ?? "",
      Bestand: eintrag.bestand,
      Reserviert: eintrag.reserviert,
      "Verfügbar": eintrag.verfuegbar,
      Bestellt: eintrag.bestellt,
      "In Auftrag": eintrag.inAuftrag,
      Mindestbestand: eintrag.mindestbestand,
      Lagerortverwaltung: eintrag.lagerortverwaltung ? "Aktiv" : "Nein",
    }));
    const arbeitsblatt = XLSX.utils.json_to_sheet(exportDaten);
    const arbeitsmappe = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(arbeitsmappe, arbeitsblatt, "Bestand");
    XLSX.writeFile(
      arbeitsmappe,
      `NOVA_Bestand_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  }

  return (
    <main className="min-h-screen bg-[var(--nova-hintergrund)] text-[var(--nova-text)] transition-colors duration-300">
      <div className="flex min-h-screen">
        <NovaSidebar />

        <section className="ml-20 min-w-0 flex-1 bg-[var(--nova-hintergrund)] px-8 py-8">
          <div className="w-full">
            <div className="mb-8">
              <h1 className="text-4xl font-bold">
                📦 Bestand
              </h1>
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-3">
              {geladen && istAdmin && (
                <NovaButton
                 type="button"
                 onClick={modalOeffnen}
              >
                + Neuer Arikel
              </NovaButton>
              )}

              <NovaButton
                type="button"
                onClick={() => void bestandExportieren()}
              >
                Export
              </NovaButton>

              <NovaButton
                type="button"
                onClick={() => void artikelLaden()}
                disabled={laedt}
              >
                {laedt
                  ? "Wird geladen..."
                  : "Aktualisieren"}
              </NovaButton>
            </div>

            {geladen && istAdmin && (
              <div className="mb-6">
                <BestandImport
                  rolle={user?.rolle ?? ""}
                  onImportAbgeschlossen={
                    importAbgeschlossen
                  }
                />
              </div>
            )}

            {erfolg && (
              <div className="mb-5 rounded-xl border border-emerald-900 bg-emerald-950/40 p-4 text-sm text-emerald-300">
                {erfolg}
              </div>
            )}

            {!modalGeoeffnet && fehler && (
              <div className="mb-5 rounded-xl border border-red-900 bg-red-950/50 p-4 text-sm text-red-300">
                {fehler}
              </div>
            )}

            {laedt && artikel.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
                Bestand wird geladen...
              </div>
            ) : artikel.length > 0 ? (
              <BestandTabelle
                artikel={artikel}
                istAdmin={istAdmin}
                rolle={user?.rolle ?? ""}
                initialerBestandsstatus={initialerBestandsstatus}
                onAktualisieren={artikelLaden}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-12 text-center">
                <p className="text-lg font-semibold text-white">
                  Noch keine Artikel vorhanden
                </p>

                <p className="mt-2 text-sm text-[var(--nova-text-schwaecher)]">
                  Ein Administrator kann Artikel manuell
                  anlegen oder aus Excel importieren.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {modalGeoeffnet && istAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] text-[var(--nova-text)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--nova-rand)] px-6 py-5">
              <div>
                <h2 className="text-2xl font-bold">
                  Neuer Artikel
                </h2>

                <p className="mt-2 text-sm text-[var(--nova-text-schwaecher)]">
                  Artikel dauerhaft im Bestand anlegen.
                </p>
              </div>

              <button
                type="button"
                onClick={modalSchliessen}
                disabled={speichert}
                className="rounded-lg px-3 py-2 text-xl text-[var(--nova-text-schwaecher)] transition hover:bg-[var(--nova-flaeche-hover)] hover:text-[var(--nova-text)]"
                aria-label="Fenster schließen"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={artikelAnlegen}
              className="p-6"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <Eingabefeld
                  label="Artikelnummer"
                  wert={formular.artikelnummer}
                  erforderlich
                  onChange={(wert) =>
                    formularFeldAendern(
                      "artikelnummer",
                      wert,
                    )
                  }
                />

                <Eingabefeld
                  label="Produktname"
                  wert={formular.produktname}
                  erforderlich
                  onChange={(wert) =>
                    formularFeldAendern(
                      "produktname",
                      wert,
                    )
                  }
                />

                <Eingabefeld
                  label="Suchbegriff"
                  wert={formular.suchbegriff}
                  onChange={(wert) =>
                    formularFeldAendern(
                      "suchbegriff",
                      wert,
                    )
                  }
                />

                <Eingabefeld
                  label="Größe"
                  wert={formular.groesse}
                  onChange={(wert) =>
                    formularFeldAendern("groesse", wert)
                  }
                />

                <Eingabefeld
                  label="Variante"
                  wert={formular.variante}
                  onChange={(wert) =>
                    formularFeldAendern("variante", wert)
                  }
                />

                <Eingabefeld
                  label="Bestand"
                  typ="number"
                  schritt="0.01"
                  wert={formular.bestand}
                  onChange={(wert) =>
                    formularFeldAendern(
                      "bestand",
                      wert,
                    )
                  }
                />

                <Eingabefeld
                  label="Reserviert"
                  typ="number"
                  schritt="0.01"
                  wert={formular.reserviert}
                  onChange={(wert) =>
                    formularFeldAendern(
                      "reserviert",
                      wert,
                    )
                  }
                />

                <Eingabefeld
                  label="Bestellt"
                  typ="number"
                  schritt="0.01"
                  wert={formular.bestellt}
                  onChange={(wert) =>
                    formularFeldAendern(
                      "bestellt",
                      wert,
                    )
                  }
                />

                <Eingabefeld
                  label="In Auftrag"
                  typ="number"
                  schritt="0.01"
                  wert={formular.inAuftrag}
                  onChange={(wert) =>
                    formularFeldAendern(
                      "inAuftrag",
                      wert,
                    )
                  }
                />

                <Eingabefeld
                  label="Mindestbestand"
                  typ="number"
                  schritt="0.01"
                  wert={formular.mindestbestand}
                  onChange={(wert) =>
                    formularFeldAendern(
                      "mindestbestand",
                      wert,
                    )
                  }
                />
              </div>

              {fehler && (
                <div className="mt-5 rounded-xl border border-red-900 bg-red-950/50 p-4 text-sm text-red-300">
                  {fehler}
                </div>
              )}

              <div className="mt-7 flex justify-end gap-3 border-t border-[var(--nova-rand)] pt-5">
                <NovaButton
                  type="button"
                  onClick={modalSchliessen}
                  disabled={speichert}
                >
                  Abbrechen
                </NovaButton>

                <NovaButton
                  type="submit"
                  disabled={speichert}
                >
                  {speichert
                    ? "Wird gespeichert..."
                    : "Artikel anlegen"}
                </NovaButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

type EingabefeldProps = {
  label: string;
  wert: string;
  erforderlich?: boolean;
  typ?: "text" | "number";
  schritt?: string;
  onChange: (wert: string) => void;
};

function Eingabefeld({
  label,
  wert,
  erforderlich = false,
  typ = "text",
  schritt,
  onChange,
}: EingabefeldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[var(--nova-text-schwaecher)]">
        {label}

        {erforderlich && (
          <span className="ml-1 text-red-400">*</span>
        )}
      </span>

      <input
        type={typ}
        step={schritt}
        value={wert}
        required={erforderlich}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-4 py-3 text-[var(--nova-text)] outline-none transition placeholder:text-[var(--nova-text-schwaecher)] focus:border-[var(--nova-akzent)] focus:ring-2 focus:ring-[var(--nova-akzent)]/20"
      />
    </label>
  );
}
