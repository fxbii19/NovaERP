import { ModulRechte } from "@/types/benutzer";

export const ADMIN_RECHTE: ModulRechte = {
    dashboard: true,
    auftraege: true,
    bestellungen: true,
    ladungen: true,
    produktzugang: true,
    bestand: true,
    qs: true,
    versand: true,
    benutzerverwaltung: true,
};

export const MITARBEITER_RECHTE: ModulRechte = {
    dashboard: false,
    auftraege: false,
    bestellungen: false,
    ladungen: false,
    produktzugang: false,
    bestand: false,
    qs: false,
    versand: false,
    benutzerverwaltung: false,
};

export const TEAMLEITER_RECHTE: ModulRechte = {
    dashboard: true,
    auftraege: true,
    bestellungen: true,
    ladungen: true,
    produktzugang: true,
    bestand: true,
    qs: true,
    versand: true,
    benutzerverwaltung: true,
};

export const SACHBEARBEITER_RECHTE: ModulRechte = {
    dashboard: true,
    auftraege: true,
    bestellungen: true,
    ladungen: true,
    produktzugang: true,
    bestand: true,
    qs: true,
    versand: true,
    benutzerverwaltung: true,
};