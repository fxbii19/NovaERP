import "server-only";

import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const scrypt = promisify(scryptCallback);

export const SITZUNGS_COOKIE = "nova-sitzung";
const SITZUNGS_DAUER_MS = 12 * 60 * 60 * 1000;

export type SichererBenutzer = {
  id: number;
  vorname: string;
  nachname: string;
  personalnummer: string;
  abteilung: string;
  rolle: string;
  aktiv: boolean;
};

export async function passwortHashErstellen(passwort: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(passwort, salt, 64)) as Buffer;
  return `scrypt$${salt}$${hash.toString("hex")}`;
}

export async function passwortPruefen(passwort: string, gespeichert: string) {
  const [verfahren, salt, hashHex] = gespeichert.split("$");
  if (verfahren !== "scrypt" || !salt || !hashHex) return false;

  const erwartet = Buffer.from(hashHex, "hex");
  const erhalten = (await scrypt(passwort, salt, erwartet.length)) as Buffer;
  return erwartet.length === erhalten.length && timingSafeEqual(erwartet, erhalten);
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function benutzerAusgeben(benutzer: {
  id: number;
  vorname: string;
  nachname: string;
  personalnummer: string;
  abteilung: string;
  rollenprofilCode: string;
  aktiv: boolean;
}): SichererBenutzer {
  return {
    id: benutzer.id,
    vorname: benutzer.vorname,
    nachname: benutzer.nachname,
    personalnummer: benutzer.personalnummer,
    abteilung: benutzer.abteilung,
    rolle: benutzer.rollenprofilCode,
    aktiv: benutzer.aktiv,
  };
}

export async function sitzungErstellen(benutzerId: number) {
  const token = randomBytes(32).toString("base64url");
  const laeuftAbAm = new Date(Date.now() + SITZUNGS_DAUER_MS);

  await prisma.benutzerSitzung.create({
    data: { tokenHash: tokenHash(token), benutzerId, laeuftAbAm },
  });

  return { token, laeuftAbAm };
}

export async function sitzungSetzen(token: string, laeuftAbAm: Date) {
  const cookieStore = await cookies();
  cookieStore.set(SITZUNGS_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NOVA_COOKIE_SECURE === "true",
    expires: laeuftAbAm,
    path: "/",
  });
}

export async function sitzungLoeschen() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SITZUNGS_COOKIE)?.value;
  cookieStore.delete(SITZUNGS_COOKIE);

  if (token) {
    try {
      await prisma.benutzerSitzung.deleteMany({
        where: { tokenHash: tokenHash(token) },
      });
    } catch (error) {
      console.error("NOVA-Sitzung konnte nicht aus der Datenbank entfernt werden:", error);
    }
  }
}

export async function aktuellerBenutzer(): Promise<SichererBenutzer | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SITZUNGS_COOKIE)?.value;
  if (!token) return null;

  const sitzung = await prisma.benutzerSitzung.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { benutzer: true },
  });

  if (!sitzung || sitzung.laeuftAbAm <= new Date() || !sitzung.benutzer.aktiv) {
    if (sitzung) {
      await prisma.benutzerSitzung.delete({ where: { id: sitzung.id } });
    }
    return null;
  }

  return benutzerAusgeben(sitzung.benutzer);
}

export async function administratorAnfordern() {
  const benutzer = await aktuellerBenutzer();
  if (!benutzer || benutzer.rolle !== "ADMIN") return null;
  return benutzer;
}
