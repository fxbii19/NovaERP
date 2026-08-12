"use client";

import { Download, RefreshCw, Rocket, X } from "lucide-react";
import { useEffect, useState } from "react";

type UpdateStatus = {
  status:
    | "pruefen"
    | "aktuell"
    | "verfuegbar"
    | "download"
    | "bereit"
    | "fehler"
    | "nicht-konfiguriert";
  aktuelleVersion?: string;
  neueVersion?: string;
  fortschritt?: number;
  meldung?: string;
  neuerungen?: string[];
};

export default function DesktopUpdateDialog() {
  const [update, setUpdate] = useState<UpdateStatus | null>(null);
  const [offen, setOffen] = useState(false);

  useEffect(() => {
    if (!window.novaDesktop) return;

    const statusUebernehmen = (status: UpdateStatus) => {
      setUpdate(status);
      if (status.status === "verfuegbar" || status.status === "bereit") {
        setOffen(true);
      }
    };

    const abmelden = window.novaDesktop.updateStatusEmpfangen(statusUebernehmen);
    void window.novaDesktop.updatePruefen().then(statusUebernehmen);

    return abmelden;
  }, []);

  if (
    !offen ||
    !update ||
    !["verfuegbar", "download", "bereit", "fehler"].includes(update.status)
  ) {
    return null;
  }

  const laedt = update.status === "download";
  const bereit = update.status === "bereit";

  async function hauptaktion() {
    if (!window.novaDesktop) return;

    if (bereit) {
      await window.novaDesktop.updateInstallieren();
      return;
    }

    const status = await window.novaDesktop.updateHerunterladen();
    setUpdate(status);
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-6 backdrop-blur-sm">
      <section className="w-full max-w-xl overflow-hidden rounded-3xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] shadow-2xl">
        <div className="flex items-start justify-between border-b border-[var(--nova-rand)] p-6">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--nova-akzent)]/15 text-[var(--nova-akzent)]">
              <Rocket className="h-6 w-6" />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--nova-akzent)]">
                NOVA Update
              </p>
              <h2 className="mt-1 text-2xl font-bold">
                Version {update.neueVersion} verfügbar
              </h2>
              <p className="mt-1 text-sm text-[var(--nova-text-schwaecher)]">
                Installiert: Version {update.aktuelleVersion}
              </p>
            </div>
          </div>

          {!laedt && (
            <button
              type="button"
              onClick={() => setOffen(false)}
              className="rounded-xl p-2 hover:bg-[var(--nova-flaeche-hover)]"
              aria-label="Später erinnern"
            >
              <X />
            </button>
          )}
        </div>

        <div className="p-6">
          <h3 className="font-semibold">Das ist neu</h3>
          <ul className="mt-3 space-y-2 text-sm text-[var(--nova-text-schwaecher)]">
            {(update.neuerungen?.length
              ? update.neuerungen
              : ["Verbesserungen und Fehlerkorrekturen für NOVA ERP."]
            ).map((eintrag) => (
              <li key={eintrag} className="flex gap-2">
                <span className="text-[var(--nova-akzent)]">✓</span>
                <span>{eintrag}</span>
              </li>
            ))}
          </ul>

          {laedt && (
            <div className="mt-6">
              <div className="mb-2 flex justify-between text-sm">
                <span>Update wird heruntergeladen …</span>
                <b>{Math.round(update.fortschritt ?? 0)} %</b>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--nova-hintergrund)]">
                <div
                  className="h-full bg-[var(--nova-akzent)] transition-all"
                  style={{ width: `${update.fortschritt ?? 0}%` }}
                />
              </div>
            </div>
          )}

          {update.status === "fehler" && (
            <p className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {update.meldung ?? "Das Update konnte nicht geladen werden."}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-[var(--nova-rand)] p-5">
          {!laedt && (
            <button
              type="button"
              onClick={() => setOffen(false)}
              className="rounded-xl border border-[var(--nova-rand)] px-5 py-3 font-semibold hover:bg-[var(--nova-flaeche-hover)]"
            >
              Später
            </button>
          )}

          <button
            type="button"
            disabled={laedt}
            onClick={() => void hauptaktion()}
            className="flex items-center gap-2 rounded-xl bg-[var(--nova-akzent)] px-5 py-3 font-semibold text-white hover:bg-[var(--nova-akzent-hover)] disabled:opacity-60"
          >
            {laedt ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {bereit
              ? "Jetzt neu starten und installieren"
              : laedt
                ? "Wird geladen"
                : "Jetzt installieren"}
          </button>
        </div>
      </section>
    </div>
  );
}
