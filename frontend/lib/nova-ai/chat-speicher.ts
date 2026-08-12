export type ChatNachricht = {
  id: string;
  rolle: "user" | "assistant";
  text: string;
  erstelltAm: string;
};

export type NovaChat = {
  id: string;
  titel: string;
  nachrichten: ChatNachricht[];
  erstelltAm: string;
  aktualisiertAm: string;
};

const SPEICHER_KEY = "nova-ai-chats";

export function chatsLaden(): NovaChat[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const gespeichert = localStorage.getItem(SPEICHER_KEY);

    if (!gespeichert) {
      return [];
    }

    const chats = JSON.parse(gespeichert);

    return Array.isArray(chats) ? chats : [];
  } catch {
    return [];
  }
}

export function chatsSpeichern(chats: NovaChat[]): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(SPEICHER_KEY, JSON.stringify(chats));
}

export function neuenChatErstellen(): NovaChat {
  const zeitpunkt = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    titel: "Neuer Chat",
    nachrichten: [],
    erstelltAm: zeitpunkt,
    aktualisiertAm: zeitpunkt,
  };
}

export function nachrichtErstellen(
  rolle: "user" | "assistant",
  text: string
): ChatNachricht {
  return {
    id: crypto.randomUUID(),
    rolle,
    text,
    erstelltAm: new Date().toISOString(),
  };
}