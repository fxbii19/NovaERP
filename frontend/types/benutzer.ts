export type Rolle =
  | "ADMIN"
  | "MITARBEITER"
  | "TEAMLEITER"
  | "SACHBEARBEITER";

export type Abteilung =
  | "Administration"
  | "Einkauf"
  | "Vertrieb"
  | "Wareneingang"
  | "Konfektion"
  | "Lager"
  | "Warenausgang"
  | "Versandbüro"
  | "Qualitätssicherung"
  | "Azubi"
  | "Buchhaltung";

export type ModulRechte = {
  dashboard: boolean;
  auftraege: boolean;
  bestellungen: boolean;
  ladungen: boolean;
  produktzugang: boolean;
  bestand: boolean;
  qs: boolean;
  versand: boolean;
  benutzerverwaltung: boolean;
};

export type NovaUser = {
  id: number;
  vorname: string;
  nachname: string;
  personalnummer: string;
  passwort?: string;
  abteilung: Abteilung;
  rolle: Rolle;
  aktiv: boolean;
  rechte: ModulRechte;
};
