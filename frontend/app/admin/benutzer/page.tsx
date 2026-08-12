"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

import {
  ADMIN_RECHTE,
  MITARBEITER_RECHTE,
  TEAMLEITER_RECHTE,
  SACHBEARBEITER_RECHTE,
} from "@/lib/rechte";


import BenutzerStatistik from "@/components/benutzer/BenutzerStatistik";
import BenutzerTabelle from "@/components/benutzer/BenutzerTabelle";
import BenutzerBearbeitenModal from "@/components/benutzer/BenutzerBearbeitenModal";
import NeuerBenutzerModal from "@/components/benutzer/NeuerBenutzerModal";
import BenutzerFilter from "@/components/benutzer/BenutzerFilter";
import BenutzerKopf from "@/components/benutzer/BenutzerKopf";
import useBenutzerVerwaltung from  "@/hooks/useBenutzerVerwaltung";

import type {
    Abteilung,
    ModulRechte,
    NovaUser,
    Rolle,
} from "@/types/benutzer";


const ABTEILUNGEN: Abteilung[] = [
  "Administration",
  "Einkauf",
  "Vertrieb",
  "Wareneingang",
  "Konfektion",
  "Lager",
  "Warenausgang",
  "Versandbüro",
  "Qualitätssicherung",
  "Azubi",
  "Buchhaltung",
];

const ROLLEN: {
  value: Rolle;
  label: string;
}[] = [
  {
    value: "MITARBEITER",
    label: "Mitarbeiter",
  },
  {
    value: "SACHBEARBEITER",
    label: "Sachbearbeiter",
  },
  {
    value: "TEAMLEITER",
    label: "Teamleiter",
  },
  {
    value: "ADMIN",
    label: "Administrator",
  },
];


function rollenName(rolle: Rolle) {
  return (
    ROLLEN.find((eintrag) => eintrag.value === rolle)?.label ??
    rolle
  );
}

export default function BenutzerverwaltungPage() {
  const router = useRouter();

const {
  geladen: authGeladen,
  istAngemeldet,
  istAdmin,
} = useAuth();

const darfBenutzerVerwalten = istAdmin;

const {
  benutzer,
  geladen,
  gefilterteBenutzer,

  formularOffen,
  setFormularOffen,

  bearbeitenOffen,
  bearbeitungsId,

  vorname,
  setVorname,
  nachname,
  setNachname,
  personalnummer,
  setPersonalnummer,
  passwort,
  setPasswort,

  abteilung,
  setAbteilung,
  rolle,
  setRolle,

  bearbeitungsVorname,
  setBearbeitungsVorname,
  bearbeitungsNachname,
  setBearbeitungsNachname,
  bearbeitungsPersonalnummer,
  setBearbeitungsPersonalnummer,
  bearbeitungsPasswort,
  setBearbeitungsPasswort,
  bearbeitungsAbteilung,
  setBearbeitungsAbteilung,
  bearbeitungsRolle,
  setBearbeitungsRolle,
  bearbeitungsAktiv,
  setBearbeitungsAktiv,

  suche,
  setSuche,
  abteilungsFilter,
  setAbteilungsFilter,
  rollenFilter,
  setRollenFilter,
  nurAktive,
  setNurAktive,

  neuerBenutzer,
  formularZuruecksetzen,
  bearbeitungStarten,
  bearbeitungAbbrechen,
  bearbeitungSpeichern,
  statusWechseln,
  benutzerLoeschen,
  filterZuruecksetzen,
} = useBenutzerVerwaltung();

useEffect(() => {
  if (!authGeladen) {
    return;
  }

  if (!istAngemeldet) {
    router.replace("/login");
    return;
  }

  if (!darfBenutzerVerwalten) {
    router.replace("/");
  }
}, [
  authGeladen,
  istAngemeldet,
  darfBenutzerVerwalten,
  router,
]);

if (!authGeladen) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      Berechtigungen werden geprüft...
    </main>
  );
}

if (!istAngemeldet || !darfBenutzerVerwalten) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      Weiterleitung...
    </main>
  );
}

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-6">
      <div className="mx-auto max-w-7xl">

<BenutzerKopf
  onNeuerBenutzer={() => setFormularOffen(true)}
/>

      <BenutzerStatistik benutzer={benutzer} />

<BenutzerFilter
  suche={suche}
  abteilungsFilter={abteilungsFilter}
  rollenFilter={rollenFilter}
  nurAktive={nurAktive}
  abteilungen={ABTEILUNGEN}
  rollen={ROLLEN}
  angezeigteBenutzer={gefilterteBenutzer.length}
  benutzerInsgesamt={benutzer.length}
  onSucheAendern={setSuche}
  onAbteilungsFilterAendern={setAbteilungsFilter}
  onRollenFilterAendern={setRollenFilter}
  onNurAktiveAendern={setNurAktive}
  onZuruecksetzen={() => {
    setSuche("");
    setAbteilungsFilter("ALLE");
    setRollenFilter("ALLE");
    setNurAktive(false);
  }}
/>

<NeuerBenutzerModal
  offen={formularOffen}
  vorname={vorname}
  nachname={nachname}
  personalnummer={personalnummer}
  passwort={passwort}
  abteilung={abteilung}
  rolle={rolle}
  abteilungen={ABTEILUNGEN}
  rollen={ROLLEN}
  onVornameAendern={setVorname}
  onNachnameAendern={setNachname}
  onPersonalnummerAendern={setPersonalnummer}
  onPasswortAendern={setPasswort}
  onAbteilungAendern={setAbteilung}
  onRolleAendern={setRolle}
  onSchliessen={() => {
    setFormularOffen(false);
    formularZuruecksetzen();
  }}
  onSpeichern={neuerBenutzer}
/>

<BenutzerTabelle
  benutzer={gefilterteBenutzer}
  onBearbeiten={bearbeitungStarten}
  onStatusWechseln={statusWechseln}
  onLoeschen={benutzerLoeschen}
/>

      </div>

   <BenutzerBearbeitenModal
  offen={bearbeitenOffen}
  benutzerId={bearbeitungsId}
  vorname={bearbeitungsVorname}
  nachname={bearbeitungsNachname}
  personalnummer={bearbeitungsPersonalnummer}
  passwort={bearbeitungsPasswort}
  abteilung={bearbeitungsAbteilung}
  rolle={bearbeitungsRolle}
  aktiv={bearbeitungsAktiv}
  abteilungen={ABTEILUNGEN}
  rollen={ROLLEN}
  onVornameAendern={setBearbeitungsVorname}
  onNachnameAendern={setBearbeitungsNachname}
  onPersonalnummerAendern={setBearbeitungsPersonalnummer}
  onPasswortAendern={setBearbeitungsPasswort}
  onAbteilungAendern={setBearbeitungsAbteilung}
  onRolleAendern={setBearbeitungsRolle}
  onAktivAendern={setBearbeitungsAktiv}
  onAbbrechen={bearbeitungAbbrechen}
  onSpeichern={bearbeitungSpeichern}
/>

    </main>
  );
}
