"use client";

import {
  Bot,
  CheckCircle2,
  Code2,
  Database,
  Layers3,
  Rocket,
  ShieldCheck,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { NOVA_STATUS, novaVersion } from "@/lib/nova-version";
import { useTheme } from "@/components/ThemeProvider";
import { einstellungenText } from "@/lib/einstellungen-i18n";
import { useEffect, useState } from "react";

const technologien = [
  "Next.js",
  "TypeScript",
  "Tailwind CSS",
  "Lucide",
  "Prisma",
  "PostgreSQL",
];

export default function UeberNova() {
  const [version, setVersion] = useState("...");

useEffect(() => {
  void novaVersion().then(setVersion);
}, []);
  const { einstellungen } = useTheme();
  const t = (key: string) => einstellungenText(einstellungen.spracheRegion, key);
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--nova-akzent)]/15">
            <Rocket className="h-6 w-6 text-[var(--nova-akzent)]" />
          </div>

          <div>
            <h2 className="text-2xl font-bold">{t("about")}</h2>

            <p className="text-sm text-[var(--nova-text-schwaecher)]">
              {t("versionInfo")}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)]/35 p-6">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-3xl font-bold">NOVA ERP</h3>

                <span className="rounded-full border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] px-3 py-1 text-xs font-medium">
                  Version {version}
                </span>
              </div>

              <p className="mt-2 max-w-2xl text-[var(--nova-text-schwaecher)]">
                {t("modernPlatform")}
              </p>

              <p className="mt-4 text-lg font-semibold text-[var(--nova-akzent)]">
                {t("slogan")}
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
              {NOVA_STATUS}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <InfoKarte
          icon={<Layers3 className="h-5 w-5" />}
          titel={t("aboutSystem")}
        >
          <p>
            {t("systemP1")}
          </p>

          <p>
            {t("systemP2")}
          </p>
        </InfoKarte>

        <InfoKarte
          icon={<User className="h-5 w-5" />}
          titel={t("development")}
        >
          <div>
            <p className="font-semibold text-[var(--nova-text)]">
              Fabian Weinhold
            </p>

            <p className="mt-1 text-sm">
              Founder · Product Lead · Lead Developer
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {[
              t("productVision"),
              t("architecture"),
              "UI / UX",
              t("developmentTag"),
            ].map((bereich) => (
              <span
                key={bereich}
                className="rounded-lg border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] px-3 py-1.5 text-xs"
              >
                {bereich}
              </span>
            ))}
          </div>
        </InfoKarte>

        <InfoKarte
          icon={<Bot className="h-5 w-5" />}
          titel="NOVA AI"
        >
          <p>
            {t("aiText")}
          </p>

          <div className="flex items-center gap-2 pt-2 text-sm font-medium text-emerald-500">
            <Sparkles className="h-4 w-4" />
            {t("aiStatus")}
          </div>
        </InfoKarte>

        <InfoKarte
          icon={<Code2 className="h-5 w-5" />}
          titel={t("technologies")}
        >
          <div className="flex flex-wrap gap-2">
            {technologien.map((technologie) => (
              <span
                key={technologie}
                className="rounded-lg border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] px-3 py-2 text-sm font-medium text-[var(--nova-text)]"
              >
                {technologie}
              </span>
            ))}
          </div>
        </InfoKarte>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <WertKarte
          icon={<Zap className="h-5 w-5" />}
          titel={t("efficient")}
          text={t("efficientText")}
        />

        <WertKarte
          icon={<Database className="h-5 w-5" />}
          titel={t("central")}
          text={t("centralText")}
        />

        <WertKarte
          icon={<ShieldCheck className="h-5 w-5" />}
          titel={t("reliable")}
          text={t("reliableText")}
        />
           </div>

      <div className="border-t border-[var(--nova-rand)] pt-5 text-center text-sm text-[var(--nova-text-schwaecher)]">
        <p>{t("developedBy")}</p>

        <p className="mt-1 text-xs">
          Build 26.03.2024
        </p>
      </div>
    </div>
  );
}

function InfoKarte({
  icon,
  titel,
  children,
}: {
  icon: React.ReactNode;
  titel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)]/35 p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--nova-akzent)]/15 text-[var(--nova-akzent)]">
          {icon}
        </div>

        <h3 className="text-lg font-semibold">{titel}</h3>
      </div>

      <div className="space-y-3 leading-7 text-[var(--nova-text-schwaecher)]">
        {children}
      </div>
    </div>
  );
}

function WertKarte({
  icon,
  titel,
  text,
}: {
  icon: React.ReactNode;
  titel: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)]/35 p-5">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--nova-akzent)]/15 text-[var(--nova-akzent)]">
        {icon}
      </div>

      <h3 className="font-semibold">{titel}</h3>

      <p className="mt-1 text-sm leading-6 text-[var(--nova-text-schwaecher)]">
        {text}
      </p>
    </div>
  );
}
