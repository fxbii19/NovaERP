"use client";

import { useState } from "react";
import { SendHorizontal } from "lucide-react";

type EingabeProps = {
  onSenden: (text: string) => void;
};

export default function Eingabe({ onSenden }: EingabeProps) {
  const [text, setText] = useState("");

  function senden() {
    const bereinigterText = text.trim();

    if (!bereinigterText) return;

    onSenden(bereinigterText);
    setText("");
  }

  return (
    <div className="h-[118px] border-t border-[var(--nova-rand)] p-3">
      <div className="flex h-full items-center">
        <div className="flex w-full items-center gap-3 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)]/40 p-3">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                senden();
              }
            }}
            placeholder="Frage NOVA AI etwas..."
            rows={1}
            className="max-h-20 min-h-[28px] flex-1 resize-none bg-transparent outline-none placeholder:text-[var(--nova-text-schwaecher)]"
          />

          <button
            type="button"
            onClick={senden}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--nova-akzent)] text-white transition hover:opacity-90"
            aria-label="Nachricht senden"
          >
            <SendHorizontal className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}