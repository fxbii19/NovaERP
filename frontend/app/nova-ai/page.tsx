"use client";

import { useEffect, useState } from "react";
import AiSidebar from "./komponenten/AiSidebar";
import ChatFenster from "./komponenten/ChatFenster";
import Eingabe from "./komponenten/Eingabe";

import { novaAntwort } from "@/lib/nova-ai/engine";

import {
  chatsLaden,
  chatsSpeichern,
  neuenChatErstellen,
  nachrichtErstellen,
  NovaChat,
} from "@/lib/nova-ai/chat-speicher";

export default function NovaAiPage() {
  const [chats, setChats] = useState<NovaChat[]>([]);
  const [aktiverChat, setAktiverChat] = useState("");

  useEffect(() => {
    const geladeneChats = chatsLaden();

    if (geladeneChats.length === 0) {
      const ersterChat = neuenChatErstellen();

      setChats([ersterChat]);
      setAktiverChat(ersterChat.id);
      return;
    }

    setChats(geladeneChats);
    setAktiverChat(geladeneChats[0].id);
  }, []);

  useEffect(() => {
    if (chats.length > 0) {
      chatsSpeichern(chats);
    }
  }, [chats]);

  const chat = chats.find((eintrag) => eintrag.id === aktiverChat);
  const nachrichten = chat?.nachrichten ?? [];

  function neuerChat() {
    const chat = neuenChatErstellen();

    setChats((alteChats) => [chat, ...alteChats]);
    setAktiverChat(chat.id);
  }

  function chatLoeschen(chatId: string) {
    setChats((alteChats) => {
      const verbleibendeChats = alteChats.filter(
        (chat) => chat.id !== chatId
      );

      if (chatId === aktiverChat) {
        if (verbleibendeChats.length > 0) {
          setAktiverChat(verbleibendeChats[0].id);
        } else {
          const neuerChat = neuenChatErstellen();

          setAktiverChat(neuerChat.id);

          return [neuerChat];
        }
      }

      return verbleibendeChats;
    });
  }

  async function nachrichtSenden(text: string) {
    if (!aktiverChat || !text.trim()) {
      return;
    }

    const userNachricht = nachrichtErstellen("user", text.trim());

    setChats((alteChats) =>
      alteChats.map((chat) =>
        chat.id === aktiverChat
          ? {
              ...chat,
              nachrichten: [...chat.nachrichten, userNachricht],
              aktualisiertAm: new Date().toISOString(),
              titel:
                chat.nachrichten.length === 0
                  ? text.trim().slice(0, 35)
                  : chat.titel,
            }
          : chat
      )
    );

    const antwort = await novaAntwort(text.trim(), nachrichten);

    const aiNachricht = nachrichtErstellen(
      "assistant",
      antwort.antwort
    );

    setTimeout(() => {
      setChats((alteChats) =>
        alteChats.map((chat) =>
          chat.id === aktiverChat
            ? {
                ...chat,
                nachrichten: [...chat.nachrichten, aiNachricht],
                aktualisiertAm: new Date().toISOString(),
              }
            : chat
        )
      );
    }, 700);
  }

  return (
    <main className="min-h-screen bg-[var(--nova-hintergrund)] p-8 text-[var(--nova-text)]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">NOVA AI</h1>

          <p className="mt-2 text-[var(--nova-text-schwaecher)]">
            Dein intelligenter Assistent für NOVA ERP.
          </p>
        </div>

        <div className="grid h-[700px] grid-cols-[260px_minmax(0,1fr)] overflow-hidden rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] shadow-2xl">
          <AiSidebar
            chats={chats}
            aktiverChat={aktiverChat}
            onChatWechsel={setAktiverChat}
            onNeuerChat={neuerChat}
            onChatLoeschen={chatLoeschen}
          />

          <section className="flex min-h-0 flex-col">
            <div className="min-h-0 flex-1 overflow-hidden">
              <ChatFenster
                nachrichten={nachrichten}
                onVorschlag={nachrichtSenden}
              />
            </div>

            <Eingabe onSenden={nachrichtSenden} />
          </section>
        </div>
      </div>
    </main>
  );
}
