"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Mail, Palmtree } from "lucide-react";

type Eintrag = {
  id: string;
  art: string;
  titel: string;
  text: string;
  link: string;
  erstelltAm: string;
};

type Daten = { anzahl: number; eintraege: Eintrag[] };
type TonTyp = "nova" | "sanft" | "glocke" | "alarm";

function tonAbspielen() {
  const gespeichert = JSON.parse(
    localStorage.getItem("nova-benachrichtigungen") ?? "{}",
  ) as { sounds?: boolean; ton?: TonTyp };
  if (gespeichert.sounds === false) return;

  const ton = gespeichert.ton ?? "nova";
  const context = new AudioContext();
  const muster: Record<TonTyp, Array<[number, number, number]>> = {
    nova: [
      [520, 0, 0.15],
      [700, 0.16, 0.18],
    ],
    sanft: [[440, 0, 0.32]],
    glocke: [
      [880, 0, 0.12],
      [1175, 0.13, 0.22],
    ],
    alarm: [
      [420, 0, 0.14],
      [330, 0.16, 0.14],
      [420, 0.32, 0.18],
    ],
  };
  muster[ton].forEach(([frequenz, start, dauer]) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = ton === "sanft" ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(frequenz, context.currentTime + start);
    gain.gain.setValueAtTime(0.0001, context.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(
      0.08,
      context.currentTime + start + 0.02,
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + start + dauer,
    );
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(context.currentTime + start);
    oscillator.stop(context.currentTime + start + dauer);
  });
}

export default function BenachrichtigungsGlocke() {
  const [daten, setDaten] = useState<Daten>({ anzahl: 0, eintraege: [] });
  const [offen, setOffen] = useState(false);
  const initialisiert = useRef(false);
  const bekannteIds = useRef(new Set<string>());
  const bereichRef = useRef<HTMLDivElement>(null);

  const laden = useCallback(async () => {
    const response = await fetch(`/api/benachrichtigungen?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!response.ok) return;
    const neu = (await response.json()) as Daten;

    if (initialisiert.current) {
      const neueEintraege = neu.eintraege.filter(
        (x) => !bekannteIds.current.has(x.id),
      );
      if (neueEintraege.length > 0) {
        tonAbspielen();
        const desktop = JSON.parse(
          localStorage.getItem("nova-benachrichtigungen") ?? "{}",
        ) as { desktop?: boolean };
        if (
          desktop.desktop &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          new Notification(neueEintraege[0].titel, {
            body: neueEintraege[0].text,
          });
        }
      }
    }

    bekannteIds.current = new Set(neu.eintraege.map((x) => x.id));
    initialisiert.current = true;
    setDaten(neu);
  }, []);

  useEffect(() => {
    void laden();
    const timer = window.setInterval(() => void laden(), 15_000);
    return () => window.clearInterval(timer);
  }, [laden]);

  useEffect(() => {
    if (!offen) return;
    function ausserhalbSchliessen(event: PointerEvent) {
      if (!bereichRef.current?.contains(event.target as Node)) setOffen(false);
    }
    document.addEventListener("pointerdown", ausserhalbSchliessen);
    return () =>
      document.removeEventListener("pointerdown", ausserhalbSchliessen);
  }, [offen]);

  async function gelesen(id?: string) {
    await fetch("/api/benachrichtigungen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : { alle: true }),
    });
    await laden();
  }

  async function oeffnen(eintrag: Eintrag) {
    await gelesen(eintrag.id);
    window.location.href = eintrag.link;
  }

  return (
    <div ref={bereichRef} className="relative">
      <button
        type="button"
        aria-label="Benachrichtigungen"
        onClick={() => setOffen((wert) => !wert)}
        className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] transition hover:border-[var(--nova-akzent)] hover:text-[var(--nova-akzent)]"
      >
        <Bell className="h-5 w-5" />
        {daten.anzahl > 0 && (
          <span className="absolute -right-2 -top-2 flex min-h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white shadow-lg">
            {daten.anzahl > 99 ? "99+" : daten.anzahl}
          </span>
        )}
      </button>

      {offen && (
        <div className="absolute right-0 top-full z-[60] mt-2 w-[390px] overflow-hidden rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--nova-rand)] px-4 py-3">
            <div>
              <h2 className="font-bold">Benachrichtigungen</h2>
              <p className="text-xs text-[var(--nova-text-schwaecher)]">
                {daten.anzahl} ungelesen
              </p>
            </div>
            {daten.anzahl > 0 && (
              <button
                onClick={() => void gelesen()}
                className="flex items-center gap-2 text-xs text-[var(--nova-akzent)] hover:underline"
              >
                <CheckCheck size={15} /> Alle gelesen
              </button>
            )}
          </div>
          <div className="max-h-[430px] overflow-y-auto p-2">
            {daten.eintraege.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-[var(--nova-text-schwaecher)]">
                Keine neuen Meldungen.
              </p>
            ) : (
              daten.eintraege.map((eintrag) => {
                const Icon =
                  eintrag.art === "MAIL"
                    ? Mail
                    : eintrag.art.startsWith("URLAUB")
                      ? Palmtree
                      : Bell;
                return (
                  <button
                    key={eintrag.id}
                    onClick={() => void oeffnen(eintrag)}
                    className="flex w-full gap-3 rounded-xl p-3 text-left transition hover:bg-[var(--nova-flaeche-hover)]"
                  >
                    <span className="mt-0.5 rounded-lg bg-[var(--nova-akzent-transparent)] p-2 text-[var(--nova-akzent)]">
                      <Icon size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm">
                        {eintrag.titel}
                      </strong>
                      <span className="mt-1 block text-xs text-[var(--nova-text-schwaecher)]">
                        {eintrag.text}
                      </span>
                      <span className="mt-1 block text-[11px] text-[var(--nova-text-schwaecher)]">
                        {new Date(eintrag.erstelltAm).toLocaleString("de-DE")}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
