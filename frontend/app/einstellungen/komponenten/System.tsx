"use client";

import { useEffect, useState } from "react";
import { DatabaseZap, RefreshCw, Tag } from "lucide-react";
import { useRouter } from "next/navigation";

import { useTheme } from "@/components/ThemeProvider";
import { einstellungenText } from "@/lib/einstellungen-i18n";
import { novaVersion } from "@/lib/nova-version";

export default function System() {
  const router = useRouter();
  const { einstellungen } = useTheme();

  const t = (key: string) =>
    einstellungenText(einstellungen.spracheRegion, key);

  const [meldung, setMeldung] = useState("");
  const [version, setVersion] = useState("...");

  useEffect(() => {
    void novaVersion().then((geladeneVersion) => {
      setVersion(geladeneVersion);
    });
  }, []);

  async function cacheLeeren() {
    if ("caches" in window) {
      const cacheNamen = await caches.keys();

      await Promise.all(
        cacheNamen.map((name) => caches.delete(name)),
      );
    }

    sessionStorage.clear();
    setMeldung(t("cacheCleared"));
    router.refresh();
  }

  return (
    <div>
      <h2 className="text-2xl font-bold">
        {t("systemSettings")}
      </h2>

      <p className="mt-2 text-[var(--nova-text-schwaecher)]">
        {t("systemSettingsText")}
      </p>

      <div className="mt-8 space-y-4">
        <SystemZeile
          icon={<Tag className="h-5 w-5" />}
          titel={t("versionNumber")}
          text={t("versionNumberText")}
        >
          <span className="rounded-full bg-[var(--nova-akzent-transparent)] px-4 py-2 font-semibold text-[var(--nova-akzent)]">
            {version}
          </span>
        </SystemZeile>

        <SystemZeile
          icon={<DatabaseZap className="h-5 w-5" />}
          titel={t("clearCache")}
          text={t("clearCacheText")}
        >
          <button
            type="button"
            onClick={() => void cacheLeeren()}
            className="rounded-xl border border-[var(--nova-rand)] px-4 py-2 font-semibold transition hover:bg-[var(--nova-akzent)] hover:text-white"
          >
            {t("clearCache")}
          </button>
        </SystemZeile>

        <SystemZeile
          icon={<RefreshCw className="h-5 w-5" />}
          titel={t("reloadData")}
          text={t("reloadDataText")}
        >
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-[var(--nova-akzent)] px-4 py-2 font-semibold text-white transition hover:bg-[var(--nova-akzent-hover)]"
          >
            {t("reloadNow")}
          </button>
        </SystemZeile>
      </div>

      {meldung && (
        <p className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-400">
          ✓ {meldung}
        </p>
      )}
    </div>
  );
}

function SystemZeile({
  icon,
  titel,
  text,
  children,
}: {
  icon: React.ReactNode;
  titel: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)]/40 p-5">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--nova-akzent-transparent)] text-[var(--nova-akzent)]">
        {icon}
      </span>

      <div className="min-w-0 flex-1">
        <h3 className="font-semibold">
          {titel}
        </h3>

        <p className="mt-1 text-sm text-[var(--nova-text-schwaecher)]">
          {text}
        </p>
      </div>

      {children}
    </section>
  );
}