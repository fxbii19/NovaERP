"use client";

import { useAuth } from "@/hooks/useAuth";

export type Modul =
  | "DASHBOARD"
  | "BENUTZER"
  | "AUFTRAEGE"
  | "BESTELLUNGEN"
  | "LADUNGEN"
  | "PRODUKTZUGANG"
  | "BESTAND"
  | "QS"
  | "VERSAND";

  const ROLLEN_RECHTE: Record<string, Modul[]> = {
    ADMIN: [
        "DASHBOARD",
        "BENUTZER",
        "AUFTRAEGE",
        "BESTELLUNGEN",
        "LADUNGEN",
        "PRODUKTZUGANG",
        "BESTAND",
        "QS",
        "VERSAND",
    ],
    
    TEAMLEITER: [
        "DASHBOARD",
        "AUFTRAEGE",
        "BESTELLUNGEN",
        "LADUNGEN",
        "PRODUKTZUGANG",
        "BESTAND",
        "QS",
        "VERSAND",
    ],

    SACHBEARBEITER: [
        "DASHBOARD",
        "AUFTRAEGE",
        "BESTELLUNGEN",
        "BESTAND",
        "VERSAND",
    ],

    MITARBEITER: [
        "DASHBOARD",
        "AUFTRAEGE",
        "BESTELLUNGEN",
        "LADUNGEN",
        "PRODUKTZUGANG",
        "BESTAND",
    ],
};

export default function useRechte() {
    const { user } = useAuth() ;

        function hatRecht(Modul: Modul) {
            if (!user) {
                return false;
        }

        const rechte =
        ROLLEN_RECHTE[user.rolle ?? "MITARBEITER"] ?? [];

        return rechte.includes(Modul);
    }

    return {
        hatRecht,
    };
}