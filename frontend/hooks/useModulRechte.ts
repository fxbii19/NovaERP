"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const FALLBACK: Record<string, string[]> = {
  ADMIN: ["dashboard", "zentrale", "vertrieb", "disposition", "buchhaltung", "cad", "bestellungen", "lager", "konfektion", "logistik", "administration", "novaAi"],
  TEAMLEITER: ["dashboard", "zentrale", "vertrieb", "disposition", "cad", "bestellungen", "lager", "konfektion", "logistik", "novaAi"],
  SACHBEARBEITER: ["dashboard", "zentrale", "vertrieb", "disposition", "buchhaltung", "cad", "bestellungen", "lager", "konfektion", "logistik", "novaAi"],
  MITARBEITER: ["dashboard", "lager", "novaAi"],
};

export default function useModulRechte() {
  const { user } = useAuth();
  const rolle = user?.rolle?.toUpperCase() ?? "MITARBEITER";
  const [rechte, setRechte] = useState<string[]>(FALLBACK[rolle] ?? []);

  useEffect(() => {
    setRechte(FALLBACK[rolle] ?? []);
    fetch("/api/administration", { cache: "no-store" })
      .then((antwort) => antwort.json())
      .then((daten) => {
        const profil = Array.isArray(daten.rollen)
          ? daten.rollen.find((eintrag: { code?: string }) => eintrag.code === rolle)
          : null;
        if (profil?.rechteJson) {
          const geladen = JSON.parse(profil.rechteJson);
          if (Array.isArray(geladen)) setRechte(geladen);
        }
      })
      .catch(() => undefined);
  }, [rolle]);

  return {
    hatModulRecht: (modul: string) => rolle === "ADMIN" || rechte.includes(modul),
  };
}
