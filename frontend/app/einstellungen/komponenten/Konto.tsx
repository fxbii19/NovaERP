"use client";

import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ThemeProvider";
import { einstellungenText } from "@/lib/einstellungen-i18n";

export default function Konto() {
  const { user, vollerName, geladen } = useAuth();
  const { einstellungen } = useTheme();
  const t = (key: string) => einstellungenText(einstellungen.spracheRegion, key);

  if (!geladen) {
    return (
      <div className="text-[var(--nova-text-schwaecher)]">
        {t("accountLoading")}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold">
          {t("account")}
        </h2>

        <p className="mt-2 text-[var(--nova-text-schwaecher)]">
          {t("accountIntro")}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)]/45">
        <div className="border-b border-[var(--nova-rand)] p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--nova-akzent)] text-xl font-bold text-white">
              {(user?.vorname?.charAt(0) || "") +
                (user?.nachname?.charAt(0) || "")}
            </div>

            <div>
              <h3 className="text-xl font-semibold text-[var(--nova-text)]">
                {vollerName || user?.nachname || "Benutzer"}
              </h3>

              <p className="mt-1 text-sm text-[var(--nova-text-schwaecher)]">
                {user?.rolle || "Mitarbeiter"}
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-[var(--nova-rand)]">
          <KontodatenZeile
            label={t("firstName")}
            wert={user?.vorname}
          />

          <KontodatenZeile
            label={t("lastName")}
            wert={user?.nachname}
          />

          <KontodatenZeile
            label={t("employeeNumber")}
            wert={user?.personalnummer}
          />

          <KontodatenZeile
            label={t("department")}
            wert={user?.abteilung}
          />

          <KontodatenZeile
            label={t("role")}
            wert={user?.rolle}
          />

          <div className="grid grid-cols-[220px_1fr] items-center px-6 py-4">
            <span className="text-sm text-[var(--nova-text-schwaecher)]">
              {t("status")}
            </span>

            <span className="flex items-center gap-2 font-medium text-emerald-400">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              {t("active")}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}

type KontodatenZeileProps = {
  label: string;
  wert?: string | number | null;
};

function KontodatenZeile({
  label,
  wert,
}: KontodatenZeileProps) {
  return (
    <div className="grid grid-cols-[220px_1fr] items-center px-6 py-4">
      <span className="text-sm text-[var(--nova-text-schwaecher)]">
        {label}
      </span>

      <span className="font-medium text-[var(--nova-text)]">
        {wert || "Nicht hinterlegt"}
      </span>
    </div>
  );
}
