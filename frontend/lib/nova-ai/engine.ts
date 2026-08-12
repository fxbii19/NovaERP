import { anfrageAnalysieren } from "./anfrage-parser";
import { toolAusfuehren } from "./tool-manager";
import type { ChatNachricht } from "./chat-speicher";

export type NovaAntwort = {
  erfolgreich: boolean;
  modul: string;
  aktion: string;
  antwort: string;
};

export async function novaAntwort(
  frage: string,
  chatverlauf: ChatNachricht[] = []
): Promise<NovaAntwort> {
  const analyse = anfrageAnalysieren(frage);

  if (analyse.modul !== "unbekannt") {
    const antwort = await toolAusfuehren(analyse);

    return {
      erfolgreich: true,
      modul: analyse.modul,
      aktion: analyse.aktion,
      antwort,
    };
  }

  try {
    const response = await fetch("/api/nova-ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        frage,
        chatverlauf: chatverlauf.slice(-12).map((nachricht) => ({
          rolle: nachricht.rolle,
          text: nachricht.text,
        })),
      }),
    });

    const daten = (await response.json()) as {
      antwort?: string;
      fehler?: string;
    };

    if (!response.ok || !daten.antwort) {
      throw new Error(daten.fehler ?? "NOVA AI ist nicht erreichbar.");
    }

    return {
      erfolgreich: true,
      modul: "unbekannt",
      aktion: analyse.aktion,
      antwort: daten.antwort,
    };
  } catch (error) {
    console.error("NOVA AI Sprachmodell:", error);

    const fehlermeldung =
      error instanceof Error
        ? error.message
        : "NOVA AI ist momentan nicht erreichbar.";

    return {
      erfolgreich: false,
      modul: "unbekannt",
      aktion: analyse.aktion,
      antwort: fehlermeldung,
    };
  }
}
