"use client";

import { useEffect, useState } from "react";

type Motivation = { anrede: string; spruch: string };

export default function MotivationsPopup() {
  const [motivation, setMotivation] = useState<Motivation | null>(null);
  const [sichtbar, setSichtbar] = useState(false);

  useEffect(() => {
    let ausblenden: number | undefined;
    let entfernen: number | undefined;

    void fetch("/api/dashboard/motivation", { method: "POST", cache: "no-store" })
      .then(async (response) => {
        if (response.status === 204 || !response.ok) return;
        const daten = await response.json() as Motivation;
        setMotivation(daten);
        window.requestAnimationFrame(() => setSichtbar(true));
        ausblenden = window.setTimeout(() => setSichtbar(false), 7_000);
        entfernen = window.setTimeout(() => setMotivation(null), 7_500);
      })
      .catch(() => undefined);

    return () => {
      if (ausblenden) window.clearTimeout(ausblenden);
      if (entfernen) window.clearTimeout(entfernen);
    };
  }, []);

  if (!motivation) return null;

  return (
    <div className={`fixed left-1/2 top-24 z-[90] w-[min(520px,calc(100vw-3rem))] -translate-x-1/2 transition-all duration-500 ${sichtbar ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-4 opacity-0"}`}>
      <div className="overflow-hidden rounded-2xl border border-[var(--nova-akzent)]/35 bg-[var(--nova-flaeche)] shadow-2xl backdrop-blur-xl">
        <div className="h-1 bg-gradient-to-r from-[var(--nova-akzent)] via-cyan-400 to-emerald-400" />
        <div className="flex gap-4 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--nova-akzent)]/15 text-xl">☀️</div>
          <div className="min-w-0"><h2 className="font-bold">{motivation.anrede}</h2><p className="mt-1 text-sm leading-6 text-[var(--nova-text-schwaecher)]">{motivation.spruch}</p></div>
          <button onClick={() => setSichtbar(false)} className="self-start rounded-lg px-2 py-1 text-[var(--nova-text-schwaecher)] hover:bg-[var(--nova-flaeche-hover)]" aria-label="Hinweis schließen">×</button>
        </div>
        <div className="h-0.5 origin-left animate-[nova-motivation_7s_linear_forwards] bg-[var(--nova-akzent)]" />
      </div>
    </div>
  );
}
