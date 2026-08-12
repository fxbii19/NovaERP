"use client";

import { useCallback, useEffect, useState } from "react";

export type AngemeldeterBenutzer = {
  id: number;
  vorname: string;
  nachname: string;
  personalnummer: string;
  abteilung: string;
  rolle: string;
  aktiv: boolean;
};

export function useAuth() {
  const [user, setUser] = useState<AngemeldeterBenutzer | null>(null);
  const [geladen, setGeladen] = useState(false);

  const sitzungLaden = useCallback(async () => {
    try {
      const antwort = await fetch("/api/auth/session", { cache: "no-store" });
      if (!antwort.ok) {
        setUser(null);
        return null;
      }
      const daten = (await antwort.json()) as { benutzer: AngemeldeterBenutzer };
      setUser(daten.benutzer);
      return daten.benutzer;
    } catch (error) {
      console.error("NOVA-Sitzung konnte nicht geladen werden:", error);
      setUser(null);
      return null;
    } finally {
      setGeladen(true);
    }
  }, []);

  useEffect(() => {
    void sitzungLaden();
  }, [sitzungLaden]);

  function login(benutzer: AngemeldeterBenutzer) {
    setUser(benutzer);
    setGeladen(true);
  }

  async function logout(ziel: "/login" | "/beendet" = "/login") {
    if (ziel === "/beendet" && user?.vorname) {
      sessionStorage.setItem("nova-abschied-name", user.vorname);
    }

    localStorage.removeItem("nova-user");
    localStorage.removeItem("nova-benutzer");
    setUser(null);

    window.location.assign(
      ziel === "/beendet"
        ? "/abmelden?ziel=beendet"
        : "/abmelden",
    );
  }

  const istAngemeldet = user !== null;
  const istAdmin = user?.rolle?.toUpperCase() === "ADMIN";
  const vollerName = user ? [user.vorname, user.nachname].filter(Boolean).join(" ") : "";

  return {
    user,
    geladen,
    login,
    logout,
    sitzungLaden,
    istAngemeldet,
    istAdmin,
    vollerName,
  };
}
