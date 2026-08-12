import { NextRequest, NextResponse } from "next/server";

import { anfrageAnalysieren } from "@/lib/nova-ai/anfrage-parser";
import { toolAusfuehren } from "@/lib/nova-ai/tool-manager";
import { prisma } from "@/lib/prisma";

type ChatEintrag = {
  rolle: "user" | "assistant";
  text: string;
};

type OpenAiInhalt = {
  type?: string;
  text?: string;
};

type OpenAiAusgabe = {
  type?: string;
  content?: OpenAiInhalt[];
};

type OpenAiAntwort = {
  output_text?: string;
  output?: OpenAiAusgabe[];
  error?: {
    message?: string;
    code?: string;
    type?: string;
  };
};

function sichereFehlermeldung(
  status: number,
  daten: OpenAiAntwort
): string {
  if (status === 401) {
    return "Der OpenAI-API-Schlüssel ist ungültig. Bitte erstelle einen neuen Schlüssel und starte den Server neu.";
  }

  if (status === 429) {
    return "Für die OpenAI API ist aktuell kein Guthaben verfügbar oder das Nutzungslimit wurde erreicht.";
  }

  if (
    status === 404 ||
    daten.error?.code === "model_not_found"
  ) {
    return "Das eingestellte OpenAI-Modell ist für diesen Zugang nicht verfügbar.";
  }

  if (status === 403) {
    return "Der OpenAI-Zugang hat keine Berechtigung für diese Anfrage.";
  }

  return `OpenAI konnte die Anfrage nicht ausführen (Fehler ${status}).`;
}

const SYSTEMANWEISUNG = `
Du bist NOVA AI, der hilfreiche KI-Assistent in NOVA ERP.
Antworte natürlich, freundlich und klar auf Deutsch.
Führe echte Gespräche und berücksichtige den bisherigen Chatverlauf.
Halte Antworten standardmäßig kurz, außer der Nutzer bittet um Details.
Du darfst sagen, dass du eine KI bist, und gibst dich niemals als Mensch aus.
Erfinde keine Unternehmensdaten, Bestände, Bestellungen oder Kennzahlen.
Wenn dir konkrete ERP-Daten fehlen, nutze zuerst die verfügbaren NOVA-Werkzeuge.
Frage nur gezielt nach, wenn die vorhandenen Werkzeuge nicht ausreichen.
Verwende Emojis nur sparsam und passend.
`.trim();

function antwortTextLesen(
  daten: OpenAiAntwort
): string {
  if (typeof daten.output_text === "string") {
    return daten.output_text.trim();
  }

  return (daten.output ?? [])
    .flatMap((ausgabe) => ausgabe.content ?? [])
    .filter((inhalt) => inhalt.type === "output_text")
    .map((inhalt) => inhalt.text ?? "")
    .join("\n")
    .trim();
}

export async function POST(
  request: NextRequest
) {
  try {
    const body = (await request.json()) as {
      frage?: unknown;
      chatverlauf?: unknown;
    };

    const frage =
      typeof body.frage === "string"
        ? body.frage.trim()
        : "";

    const chatverlauf = Array.isArray(body.chatverlauf)
      ? body.chatverlauf
          .filter(
            (eintrag): eintrag is ChatEintrag =>
              typeof eintrag === "object" &&
              eintrag !== null &&
              ["user", "assistant"].includes(
                (eintrag as ChatEintrag).rolle
              ) &&
              typeof (eintrag as ChatEintrag).text ===
                "string"
          )
          .slice(-12)
      : [];

    if (!frage) {
      return NextResponse.json(
        {
          fehler: "Bitte gib eine Frage ein.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Zuerst versucht NOVA, die Anfrage mit den
     * eigenen ERP-Werkzeugen zu beantworten.
     */
    const novaAnfrage = anfrageAnalysieren(frage);

    const lokaleAnfrage =
      novaAnfrage.intent === "DIAGNOSE" ||
      novaAnfrage.modul !== "unbekannt";

    if (lokaleAnfrage) {
  let postgresOk = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    postgresOk = true;
  } catch {}

  let aktiverArtikel = false;

  try {
    const artikel = await prisma.artikel.findFirst({
      where: {
        aktiv: true,
      },
      select: {
        id: true,
      },
    });

    aktiverArtikel = Boolean(artikel);
  } catch {}

  let aktiverLagerplatz = false;

try {
  const lagerplatz = await prisma.lagerplatz.findFirst({
    where: {
      aktiv: true,
    },
    select: {
      id: true,
    },
  });

  aktiverLagerplatz = Boolean(lagerplatz);
} catch {}

let demoApiVorhanden = false;

try {
  const response = await fetch(
    new URL("/api/demo", request.url),
    { method: "HEAD" }
  );

  demoApiVorhanden = response.status !== 404;
} catch {}

  const lokaleAntwort =
    await toolAusfuehren(novaAnfrage);

  return NextResponse.json({
    antwort:
      `${postgresOk ? "✅ PostgreSQL erreichbar.\n" : "❌ PostgreSQL nicht erreichbar.\n"}${
  aktiverArtikel
    ? "✅ Aktiver Artikel gefunden.\n\n"
    : "❌ Kein aktiver Artikel gefunden.\n\n"}
    ${aktiverLagerplatz
  ? "✅ Aktiver Lagerplatz gefunden.\n\n"
  : "❌ Kein aktiver Lagerplatz gefunden.\n\n"}
}${lokaleAntwort}`,
    quelle: "nova-tool",
  });

}

    /*
     * Nur unbekannte oder allgemeine Fragen
     * werden an OpenAI weitergegeben.
     */
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          fehler:
            "Für diese allgemeine Frage ist OpenAI erforderlich. Der API-Schlüssel ist noch nicht eingerichtet.",
        },
        {
          status: 503,
        }
      );
    }

    const openAiResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model:
            process.env.OPENAI_MODEL ??
            "gpt-5-mini",
          instructions: SYSTEMANWEISUNG,
          input: [
            ...chatverlauf.map((eintrag) => ({
              role: eintrag.rolle,
              content: eintrag.text,
            })),
            {
              role: "user",
              content: frage,
            },
          ],
          reasoning: {
            effort: "low",
          },
          text: {
            verbosity: "low",
          },
          max_output_tokens: 600,
        }),
      }
    );

    const daten =
      (await openAiResponse.json()) as OpenAiAntwort;

    if (!openAiResponse.ok) {
      console.error(
        "OpenAI API:",
        daten.error?.message ??
          openAiResponse.status
      );

      return NextResponse.json(
        {
          fehler: sichereFehlermeldung(
            openAiResponse.status,
            daten
          ),
        },
        {
          status: 502,
        }
      );
    }

    const antwort = antwortTextLesen(daten);

    if (!antwort) {
      return NextResponse.json(
        {
          fehler:
            "NOVA AI hat eine leere Antwort geliefert.",
        },
        {
          status: 502,
        }
      );
    }

    return NextResponse.json({
      antwort,
      quelle: "openai",
    });
  } catch (error) {
    console.error("NOVA AI Chat:", error);

    return NextResponse.json(
      {
        fehler:
          "NOVA AI konnte die Anfrage nicht verarbeiten.",
      },
      {
        status: 500,
      }
    );
  }
}