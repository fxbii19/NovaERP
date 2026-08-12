"use client";

import {
  MessageSquare,
  Plus,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { NovaChat } from "@/lib/nova-ai/chat-speicher";

type Props = {
  chats: NovaChat[];
  aktiverChat: string;
  onChatWechsel: (id: string) => void;
  onNeuerChat: () => void;
  onChatLoeschen: (id: string) => void;
};

export default function AiSidebar({
  chats,
  aktiverChat,
  onChatWechsel,
  onNeuerChat,
  onChatLoeschen,
}: Props) {
  const [suche, setSuche] = useState("");

  const gefilterteChats = useMemo(() => {
    return chats.filter((chat) =>
      chat.titel.toLowerCase().includes(suche.toLowerCase())
    );
  }, [chats, suche]);

  return (
    <aside className="grid h-full min-h-0 w-[260px] grid-rows-[auto_1fr_auto] border-r border-[var(--nova-rand)] bg-[var(--nova-hintergrund)]/40">
      <div className="border-b border-[var(--nova-rand)] p-4">
        <button
          onClick={onNeuerChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--nova-akzent)] px-4 py-3 font-medium text-white transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Neuer Chat
        </button>

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--nova-text-schwaecher)]" />

          <input
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            placeholder="Chats durchsuchen..."
            className="w-full rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-[var(--nova-akzent)]"
          />
        </div>
      </div>

      <div className="min-h-0 overflow-y-auto p-3">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-[var(--nova-text-schwaecher)]">
          Verlauf
        </p>

        <div className="space-y-1">
          {gefilterteChats.map((chat) => {
            const aktiv = chat.id === aktiverChat;

            return (
              <div
                key={chat.id}
                className={`group flex items-center rounded-xl transition ${
                  aktiv
                    ? "bg-[var(--nova-akzent)]/15 text-[var(--nova-text)]"
                    : "text-[var(--nova-text-schwaecher)] hover:bg-[var(--nova-flaeche-hover)] hover:text-[var(--nova-text)]"
                }`}
              >
                <button
                  onClick={() => onChatWechsel(chat.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left text-sm"
                >
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="truncate">{chat.titel}</span>
                </button>

                <button
                  onClick={() => onChatLoeschen(chat.id)}
                  className="mr-2 flex h-8 w-8 items-center justify-center rounded-lg opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}

          {gefilterteChats.length === 0 && (
            <p className="px-3 py-4 text-sm text-[var(--nova-text-schwaecher)]">
              Keine Chats gefunden.
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-[var(--nova-rand)] p-3">
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[var(--nova-text-schwaecher)] transition hover:bg-[var(--nova-flaeche-hover)] hover:text-[var(--nova-text)]">
          <Settings className="h-4 w-4" />
          AI-Einstellungen
        </button>
      </div>
    </aside>
  );
}