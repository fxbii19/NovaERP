"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Package,
  ClipboardList,
  BarChart3,
  ClipboardCheck,
} from "lucide-react";

type Nachricht = {
  rolle: "user" | "assistant";
  text: string;
};

type ChatFensterProps = {
  nachrichten: Nachricht[];
  onVorschlag: (text: string) => void | Promise<void>;
};

const vorschlaege = [
  {
    titel: "Bestand prüfen",
    text: "Prüfe den aktuellen Lagerbestand.",
    icon: Package,
  },
  {
    titel: "Bestellungen",
    text: "Zeige mir offene Bestellungen.",
    icon: ClipboardList,
  },
  {
    titel: "Dashboard",
    text: "Analysiere das Dashboard.",
    icon: BarChart3,
  },
  {
    titel: "Inventur",
    text: "Starte eine Inventurübersicht.",
    icon: ClipboardCheck,
  },
];

export default function ChatFenster({
  nachrichten,
  onVorschlag,
}: ChatFensterProps) {
  const istLeer = nachrichten.length === 0;
  const chatEndeRef = useRef<HTMLDivElement>(null);
  const [begruessung, setBegruessung] = useState("Guten Tag");

  useEffect(() => {
    const stunde = new Date().getHours();

    if (stunde >= 5 && stunde < 12) {
      setBegruessung("Guten Morgen");
      return;
    }

    if (stunde >= 18 || stunde < 5) {
      setBegruessung("Guten Abend");
      return;
    }

    setBegruessung("Guten Tag");
  }, []);

  useEffect(() => {
    chatEndeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [nachrichten]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-[var(--nova-rand)] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--nova-akzent)]/15 text-[var(--nova-akzent)]">
            <Bot className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold">NOVA AI</h2>

            <div className="flex items-center gap-2 text-xs text-[var(--nova-text-schwaecher)]">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Online
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {istLeer ? (
          <div className="mx-auto flex min-h-full max-w-4xl flex-col items-center justify-center py-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              {begruessung} 👋
            </h2>

            <p className="mt-3 text-base text-[var(--nova-text-schwaecher)]">
              Wobei kann ich dich heute unterstützen?
            </p>

            <div className="mt-8 grid w-full gap-4 md:grid-cols-2">
              {vorschlaege.map((vorschlag) => {
                const Icon = vorschlag.icon;

                return (
                  <button
                    type="button"
                    key={vorschlag.titel}
                    onClick={() => onVorschlag(vorschlag.text)}
                    className="cursor-pointer rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)]/35 p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:border-[var(--nova-akzent)] hover:bg-[var(--nova-flaeche-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nova-akzent)]"
                  >
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--nova-akzent)]/15 text-[var(--nova-akzent)]">
                      <Icon className="h-5 w-5" />
                    </div>

                    <h3 className="text-lg font-semibold">
                      {vorschlag.titel}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-[var(--nova-text-schwaecher)]">
                      {vorschlag.text}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-5">
            {nachrichten.map((nachricht, index) => (
              <div
                key={index}
                className={`flex ${
                  nachricht.rolle === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-4 py-3 leading-6 ${
                    nachricht.rolle === "user"
                      ? "bg-[var(--nova-akzent)] text-white"
                      : "border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)]/40 text-[var(--nova-text)]"
                  }`}
                >
                  {nachricht.text}
                </div>
              </div>
            ))}

            <div ref={chatEndeRef} />
          </div>
        )}
      </div>
    </div>
  );
}
