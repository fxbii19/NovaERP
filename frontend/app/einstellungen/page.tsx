"use client";

import { useState } from "react";
import Link from "next/link";

import Konto from "./komponenten/Konto";
import Darstellung from "./komponenten/Darstellung";
import Benachrichtigungen from "./komponenten/Benachrichtigungen";
import Sicherheit from "./komponenten/Sicherheit";
import UeberNova from "./komponenten/UeberNova";
import System from "./komponenten/System";
import { useTheme } from "@/components/ThemeProvider";
import { einstellungenText } from "@/lib/einstellungen-i18n";

type Bereich =
  | "konto"
  | "darstellung"
  | "benachrichtigungen"
  | "sicherheit"
  | "system"
  | "ueber";

export default function EinstellungenPage() {
  const { einstellungen } = useTheme();
  const t = (key: string) => einstellungenText(einstellungen.spracheRegion, key);
  const [aktiverBereich, setAktiverBereich] =
    useState<Bereich>("konto");

  const menueKlasse = (bereich: Bereich) =>
    `mb-2 w-full rounded-xl px-4 py-3 text-left transition-all duration-200 ${
      aktiverBereich === bereich
        ? "bg-[var(--nova-akzent)] text-white shadow-md"
        : "text-[var(--nova-text-schwaecher)] hover:bg-[var(--nova-flaeche-hover)] hover:text-[var(--nova-text)]"
    }`;

  return (
    <main className="min-h-screen bg-[var(--nova-hintergrund)] p-8 text-[var(--nova-text)] transition-colors duration-300">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">
              {t("settings")}
            </h1>

            <p className="mt-2 text-[var(--nova-text-schwaecher)]">
              {t("settingsIntro")}
            </p>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] px-4 py-2 text-[var(--nova-text)] transition-all duration-200 hover:bg-[var(--nova-flaeche-hover)]"
          >
            ← {t("dashboard")}
          </Link>
        </div>

        <div className="grid min-h-[650px] grid-cols-[260px_1fr] overflow-hidden rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] shadow-2xl transition-colors duration-300">
          <aside className="border-r border-[var(--nova-rand)] bg-[var(--nova-hintergrund)]/40 p-4">
            <button
              onClick={() => setAktiverBereich("konto")}
              className={menueKlasse("konto")}
            >
              👤 {t("account")}
            </button>

            <button
              onClick={() => setAktiverBereich("darstellung")}
              className={menueKlasse("darstellung")}
            >
              🎨 {t("appearance")}
            </button>

            <button
              onClick={() =>
                setAktiverBereich("benachrichtigungen")
              }
              className={menueKlasse("benachrichtigungen")}
            >
              🔔 {t("notifications")}
            </button>

            <button
              onClick={() => setAktiverBereich("sicherheit")}
              className={menueKlasse("sicherheit")}
            >
              🔒 {t("security")}
            </button>

            <button
              onClick={() => setAktiverBereich("system")}
              className={menueKlasse("system")}
            >
              🖥️ {t("systemSettings")}
            </button>

            <button
              onClick={() => setAktiverBereich("ueber")}
              className={menueKlasse("ueber")}
            >
              ℹ️ {t("about")}
            </button>
          </aside>

          <section className="bg-[var(--nova-flaeche)] p-10 text-[var(--nova-text)] transition-colors duration-300">
            {aktiverBereich === "konto" && <Konto />}

            {aktiverBereich === "darstellung" && (
              <Darstellung />
            )}

            {aktiverBereich === "benachrichtigungen" && (
              <Benachrichtigungen />
            )}

            {aktiverBereich === "sicherheit" && (
              <Sicherheit />
            )}

            {aktiverBereich === "system" && <System />}

            {aktiverBereich === "ueber" && (
              <UeberNova />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
