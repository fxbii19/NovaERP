"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ADMIN_RECHTE,
  MITARBEITER_RECHTE,
  SACHBEARBEITER_RECHTE,
  TEAMLEITER_RECHTE,
} from "@/lib/rechte";
import type { Abteilung, NovaUser, Rolle } from "@/types/benutzer";

type BenutzerAntwort = Omit<NovaUser, "rechte" | "passwort">;

function rollenName(rolle: Rolle) {
  return {
    ADMIN: "Administrator",
    TEAMLEITER: "Teamleiter",
    SACHBEARBEITER: "Sachbearbeiter",
    MITARBEITER: "Mitarbeiter",
  }[rolle];
}

function rechteFuerRolle(rolle: Rolle) {
  switch (rolle) {
    case "ADMIN": return { ...ADMIN_RECHTE };
    case "TEAMLEITER": return { ...TEAMLEITER_RECHTE };
    case "SACHBEARBEITER": return { ...SACHBEARBEITER_RECHTE };
    default: return { ...MITARBEITER_RECHTE };
  }
}

function mitRechten(eintrag: BenutzerAntwort): NovaUser {
  return { ...eintrag, passwort: "", rechte: rechteFuerRolle(eintrag.rolle) };
}

async function fehlerLesen(response: Response) {
  const daten = await response.json().catch(() => ({}));
  return typeof daten.fehler === "string" ? daten.fehler : "Die Aktion konnte nicht ausgeführt werden.";
}

export default function useBenutzerVerwaltung() {
  const router = useRouter();
  const [benutzer, setBenutzer] = useState<NovaUser[]>([]);
  const [geladen, setGeladen] = useState(false);
  const [formularOffen, setFormularOffen] = useState(false);
  const [bearbeitenOffen, setBearbeitenOffen] = useState(false);
  const [bearbeitungsId, setBearbeitungsId] = useState<number | null>(null);
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [personalnummer, setPersonalnummer] = useState("");
  const [passwort, setPasswort] = useState("");
  const [abteilung, setAbteilung] = useState<Abteilung>("Wareneingang");
  const [rolle, setRolle] = useState<Rolle>("MITARBEITER");
  const [bearbeitungsVorname, setBearbeitungsVorname] = useState("");
  const [bearbeitungsNachname, setBearbeitungsNachname] = useState("");
  const [bearbeitungsPersonalnummer, setBearbeitungsPersonalnummer] = useState("");
  const [bearbeitungsPasswort, setBearbeitungsPasswort] = useState("");
  const [bearbeitungsAbteilung, setBearbeitungsAbteilung] = useState<Abteilung>("Wareneingang");
  const [bearbeitungsRolle, setBearbeitungsRolle] = useState<Rolle>("MITARBEITER");
  const [bearbeitungsAktiv, setBearbeitungsAktiv] = useState(true);
  const [suche, setSuche] = useState("");
  const [abteilungsFilter, setAbteilungsFilter] = useState<Abteilung | "ALLE">("ALLE");
  const [rollenFilter, setRollenFilter] = useState<Rolle | "ALLE">("ALLE");
  const [nurAktive, setNurAktive] = useState(false);

  useEffect(() => {
    let aktiv = true;
    fetch("/api/benutzer", { cache: "no-store" }).then(async (response) => {
      if (response.status === 401) return router.replace("/login");
      if (response.status === 403) return router.replace("/");
      if (!response.ok) throw new Error(await fehlerLesen(response));
      const daten = await response.json() as { benutzer: BenutzerAntwort[] };
      if (aktiv) setBenutzer(daten.benutzer.map(mitRechten));
    }).catch((error) => alert(error instanceof Error ? error.message : "Benutzer konnten nicht geladen werden."))
      .finally(() => aktiv && setGeladen(true));
    return () => { aktiv = false; };
  }, [router]);

  const gefilterteBenutzer = useMemo(() => {
    const text = suche.trim().toLowerCase();
    return benutzer.filter((eintrag) =>
      (!text || [eintrag.vorname, eintrag.nachname, eintrag.personalnummer, eintrag.abteilung, rollenName(eintrag.rolle)]
        .some((wert) => wert.toLowerCase().includes(text))) &&
      (abteilungsFilter === "ALLE" || eintrag.abteilung === abteilungsFilter) &&
      (rollenFilter === "ALLE" || eintrag.rolle === rollenFilter) &&
      (!nurAktive || eintrag.aktiv)
    );
  }, [benutzer, suche, abteilungsFilter, rollenFilter, nurAktive]);

  function formularZuruecksetzen() {
    setVorname(""); setNachname(""); setPersonalnummer(""); setPasswort("");
    setAbteilung("Wareneingang"); setRolle("MITARBEITER");
  }

  async function neuerBenutzer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwort.trim().length < 4) return alert("Das Passwort muss mindestens 4 Zeichen lang sein.");
    const response = await fetch("/api/benutzer", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vorname, nachname, passwort, abteilung, rolle }),
    });
    if (!response.ok) return alert(await fehlerLesen(response));
    const daten = await response.json() as { benutzer: BenutzerAntwort };
    const eintrag = mitRechten(daten.benutzer);
    setBenutzer((liste) => [...liste, eintrag]);
    formularZuruecksetzen(); setFormularOffen(false);
  }

  function bearbeitungStarten(eintrag: NovaUser) {
    setBearbeitungsId(eintrag.id); setBearbeitungsVorname(eintrag.vorname);
    setBearbeitungsNachname(eintrag.nachname); setBearbeitungsPersonalnummer(eintrag.personalnummer);
    setBearbeitungsPasswort(""); setBearbeitungsAbteilung(eintrag.abteilung);
    setBearbeitungsRolle(eintrag.rolle); setBearbeitungsAktiv(eintrag.aktiv); setBearbeitenOffen(true);
  }

  function bearbeitungAbbrechen() { setBearbeitenOffen(false); setBearbeitungsId(null); setBearbeitungsPasswort(""); }

  async function bearbeitungSpeichern(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (bearbeitungsId === null) return;
    if (bearbeitungsPasswort && bearbeitungsPasswort.length < 4) return alert("Das neue Passwort muss mindestens 4 Zeichen lang sein.");
    const response = await fetch("/api/benutzer", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: bearbeitungsId, vorname: bearbeitungsVorname, nachname: bearbeitungsNachname,
        personalnummer: bearbeitungsPersonalnummer, passwort: bearbeitungsPasswort || undefined,
        abteilung: bearbeitungsAbteilung, rolle: bearbeitungsRolle, aktiv: bearbeitungsAktiv }),
    });
    if (!response.ok) return alert(await fehlerLesen(response));
    const daten = await response.json() as { benutzer: BenutzerAntwort };
    const aktualisiert = mitRechten(daten.benutzer);
    setBenutzer((liste) => liste.map((eintrag) => eintrag.id === aktualisiert.id ? aktualisiert : eintrag));
    bearbeitungAbbrechen();
  }

  async function statusWechseln(id: number) {
    const eintrag = benutzer.find((wert) => wert.id === id); if (!eintrag) return;
    const response = await fetch("/api/benutzer", { method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...eintrag, passwort: undefined, aktiv: !eintrag.aktiv }) });
    if (!response.ok) return alert(await fehlerLesen(response));
    const daten = await response.json() as { benutzer: BenutzerAntwort };
    const aktualisiert = mitRechten(daten.benutzer);
    setBenutzer((liste) => liste.map((wert) => wert.id === id ? aktualisiert : wert));
  }

  async function benutzerLoeschen(eintrag: NovaUser) {
    if (!window.confirm(`Möchtest du ${eintrag.vorname} ${eintrag.nachname} wirklich löschen?`)) return;
    const response = await fetch(`/api/benutzer?id=${eintrag.id}`, { method: "DELETE" });
    if (!response.ok) return alert(await fehlerLesen(response));
    setBenutzer((liste) => liste.filter((wert) => wert.id !== eintrag.id));
  }

  function filterZuruecksetzen() { setSuche(""); setAbteilungsFilter("ALLE"); setRollenFilter("ALLE"); setNurAktive(false); }

  return { benutzer, geladen, gefilterteBenutzer, formularOffen, setFormularOffen, bearbeitenOffen, setBearbeitenOffen,
    bearbeitungsId, vorname, setVorname, nachname, setNachname, personalnummer, setPersonalnummer, passwort, setPasswort,
    abteilung, setAbteilung, rolle, setRolle, bearbeitungsVorname, setBearbeitungsVorname, bearbeitungsNachname,
    setBearbeitungsNachname, bearbeitungsPersonalnummer, setBearbeitungsPersonalnummer, bearbeitungsPasswort,
    setBearbeitungsPasswort, bearbeitungsAbteilung, setBearbeitungsAbteilung, bearbeitungsRolle, setBearbeitungsRolle,
    bearbeitungsAktiv, setBearbeitungsAktiv, suche, setSuche, abteilungsFilter, setAbteilungsFilter, rollenFilter,
    setRollenFilter, nurAktive, setNurAktive, neuerBenutzer, formularZuruecksetzen, bearbeitungStarten,
    bearbeitungAbbrechen, bearbeitungSpeichern, statusWechseln, benutzerLoeschen, filterZuruecksetzen };
}
