"use client";

import { Bot, SendHorizontal, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { novaAntwort } from "@/lib/nova-ai/engine";
import {
  nachrichtErstellen,
  type ChatNachricht,
} from "@/lib/nova-ai/chat-speicher";

export default function NovaAiChatButton() {
  const [offen, setOffen] = useState(false);
  const [text, setText] = useState("");
  const [nachrichten, setNachrichten] = useState<ChatNachricht[]>([]);
  const [antwortet, setAntwortet] = useState(false);
  const [begruessung, setBegruessung] = useState("Guten Tag");
  const endeRef = useRef<HTMLDivElement>(null);
  const eingabeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endeRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [nachrichten, antwortet]);

  useEffect(() => {
    if (offen) {
      const stunde = new Date().getHours();

      if (stunde >= 5 && stunde < 12) {
        setBegruessung("Guten Morgen");
      } else if (stunde >= 18 || stunde < 5) {
        setBegruessung("Guten Abend");
      } else {
        setBegruessung("Guten Tag");
      }

      window.setTimeout(() => eingabeRef.current?.focus(), 250);
    }
  }, [offen]);

  async function senden(event: FormEvent) {
    event.preventDefault();
    const frage = text.trim();
    if (!frage || antwortet) return;

    const userNachricht = nachrichtErstellen("user", frage);
    const bisherigerVerlauf = nachrichten;
    setNachrichten((aktuell) => [...aktuell, userNachricht]);
    setText("");
    setAntwortet(true);

    const ergebnis = await novaAntwort(frage, bisherigerVerlauf);
    setNachrichten((aktuell) => [
      ...aktuell,
      nachrichtErstellen("assistant", ergebnis.antwort),
    ]);
    setAntwortet(false);
  }

  return (
    <div className="fixed bottom-6 right-6 z-[60]">
      <div
        aria-hidden={!offen}
        className={`absolute bottom-16 right-0 flex h-[560px] w-[390px] origin-bottom-right flex-col overflow-hidden rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] shadow-2xl shadow-black/50 transition-all duration-300 ease-out max-sm:fixed max-sm:inset-x-3 max-sm:bottom-24 max-sm:h-[70vh] max-sm:w-auto ${
          offen
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-5 scale-90 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-[var(--nova-rand)] px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--nova-akzent-transparent)] text-[var(--nova-akzent)]">
              <Bot className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-[var(--nova-text)]">NOVA AI</p>
              <p className="flex items-center gap-1.5 text-xs text-[var(--nova-text-schwaecher)]">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Online
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOffen(false)}
            className="rounded-lg p-2 text-[var(--nova-text-schwaecher)] transition hover:bg-[var(--nova-flaeche-hover)] hover:text-[var(--nova-text)]"
            aria-label="NOVA AI schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {nachrichten.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center px-5 text-center">
              <Bot className="h-10 w-10 text-[var(--nova-akzent)]" />
              <p className="mt-4 text-lg font-semibold text-[var(--nova-text)]">
                {begruessung} 👋
              </p>
              <p className="mt-2 text-sm text-[var(--nova-text-schwaecher)]">
                Wobei kann ich dich heute unterstützen?
              </p>
            </div>
          )}

          {nachrichten.map((nachricht) => (
            <div
              key={nachricht.id}
              className={`flex ${
                nachricht.rolle === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-5 ${
                  nachricht.rolle === "user"
                    ? "bg-[var(--nova-akzent)] text-white"
                    : "border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] text-[var(--nova-text)]"
                }`}
              >
                {nachricht.text}
              </div>
            </div>
          ))}

          {antwortet && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-4 py-3 text-sm text-[var(--nova-text-schwaecher)]">
                NOVA schreibt …
              </div>
            </div>
          )}
          <div ref={endeRef} />
        </div>

        <form
          onSubmit={senden}
          className="flex gap-2 border-t border-[var(--nova-rand)] p-3"
        >
          <input
            ref={eingabeRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Frage NOVA AI etwas..."
            className="min-w-0 flex-1 rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-4 py-3 text-sm text-[var(--nova-text)] outline-none placeholder:text-[var(--nova-text-schwaecher)] focus:border-[var(--nova-akzent)]"
          />
          <button
            type="submit"
            disabled={!text.trim() || antwortet}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--nova-akzent)] text-white transition hover:brightness-110 disabled:opacity-50"
            aria-label="Nachricht senden"
          >
            <SendHorizontal className="h-5 w-5" />
          </button>
        </form>
      </div>

      <button
        type="button"
        onClick={() => setOffen((aktuell) => !aktuell)}
        aria-label={offen ? "NOVA AI schließen" : "NOVA AI öffnen"}
        title="NOVA AI"
        className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-[var(--nova-akzent)] text-white shadow-2xl shadow-purple-950/40 transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:brightness-110 ${
          offen ? "rotate-6 scale-95" : "rotate-0 scale-100"
        }`}
      >
        {offen ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
        {!offen && (
          <span className="absolute right-0.5 top-0.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--nova-akzent)] bg-emerald-400" />
        )}
      </button>
    </div>
  );
}
