import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aktuellerBenutzer } from "@/lib/auth-server";

type Anhang = {
  name: string;
  url: string;
  typ?: string;
  groesse?: number;
};

type ChatMeta = {
  dateien: Anhang[];
  reaktionen: Record<string, string[]>;
};

const TEAM_KANAELE = [
  ["NOVA Allgemein", "Unternehmensweite Zusammenarbeit", null],
  ["Lager", "Wareneingang, Bestand und Lagerprozesse", "Lager"],
  ["Einkauf", "Bestellungen und Lieferanten", "Einkauf"],
  ["Vertrieb", "Kunden, Angebote und Aufträge", "Vertrieb"],
  ["Qualitätssicherung", "Prüfungen, Freigaben und Sperrbestand", "QS"],
  ["Versand", "Kommissionierung, Ladungen und Versand", "Versand"],
  ["Administration", "Organisation und Verwaltung", "Administration"],
  ["IT", "Systeme, Support und Entwicklung", "IT"],
] as const;

function alsText(wert: unknown, fallback = "") {
  return typeof wert === "string" ? wert.trim() : fallback;
}

function alsId(wert: unknown) {
  const nummer = Number(wert);
  return Number.isInteger(nummer) && nummer > 0 ? nummer : null;
}

function jsonLesen<T>(wert: string | null | undefined, fallback: T): T {
  if (!wert) return fallback;
  try {
    return JSON.parse(wert) as T;
  } catch {
    return fallback;
  }
}

function anhaengeLesen(wert: string | null | undefined): Anhang[] {
  const daten = jsonLesen<unknown>(wert, []);
  if (Array.isArray(daten)) return daten as Anhang[];
  if (daten && typeof daten === "object" && "dateien" in daten) {
    return Array.isArray((daten as ChatMeta).dateien)
      ? (daten as ChatMeta).dateien
      : [];
  }
  return [];
}

function chatMetaLesen(wert: string | null | undefined): ChatMeta {
  const daten = jsonLesen<unknown>(wert, []);
  if (Array.isArray(daten)) return { dateien: daten as Anhang[], reaktionen: {} };
  if (daten && typeof daten === "object") {
    const meta = daten as Partial<ChatMeta>;
    return {
      dateien: Array.isArray(meta.dateien) ? meta.dateien : [],
      reaktionen:
        meta.reaktionen && typeof meta.reaktionen === "object"
          ? meta.reaktionen
          : {},
    };
  }
  return { dateien: [], reaktionen: {} };
}

function mitgliederLesen(wert: string | null | undefined) {
  return jsonLesen<number[]>(wert, []).filter((id) => Number.isInteger(id));
}

function slug(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function benutzerMail(nachname: string, vorname = "") {
  return `${slug(nachname || vorname || "mitarbeiter")}@nova-test.de`;
}

async function demoSicherstellen(benutzer: {
  id: number;
  vorname: string;
  nachname: string;
}) {
  for (const [name, beschreibung, abteilung] of TEAM_KANAELE) {
    const vorhanden = await prisma.kommunikationsKanal.findFirst({
      where: { name, typ: "TEAM" },
      select: { id: true },
    });

    if (!vorhanden) {
      await prisma.kommunikationsKanal.create({
        data: {
          name,
          typ: "TEAM",
          beschreibung,
          abteilung,
          erstelltVonId: benutzer.id,
          mitgliederJson: "[]",
        },
      });
    }
  }

  const mailAnzahl = await prisma.novaMail.count({
    where: { benutzerId: benutzer.id },
  });

  if (mailAnzahl === 0) {
    await prisma.novaMail.createMany({
      data: [
        {
          nachrichtenId: `willkommen-${benutzer.id}`,
          absender: "zentrale@nova.local",
          empfaenger: benutzerMail(benutzer.nachname, benutzer.vorname),
          betreff: "Willkommen bei NOVA Connect",
          inhalt:
            "NOVA Mail, interne Chats, Teams, Dateien und ERP-Verknüpfungen befinden sich jetzt an einem Ort.",
          ordner: "POSTEINGANG",
          benutzerId: benutzer.id,
        },
        {
          nachrichtenId: `tagesinfo-${benutzer.id}`,
          absender: "system@nova.local",
          empfaenger: benutzerMail(benutzer.nachname, benutzer.vorname),
          betreff: "Tagesübersicht verfügbar",
          inhalt:
            "Die aktuelle Tagesübersicht ist im NOVA AI Command Center verfügbar.",
          ordner: "POSTEINGANG",
          benutzerId: benutzer.id,
        },
      ],
    });
  }
}

function kanalErlaubt(
  kanal: { typ: string; mitgliederJson: string },
  benutzerId: number,
) {
  return kanal.typ === "TEAM" || mitgliederLesen(kanal.mitgliederJson).includes(benutzerId);
}

async function kanalPruefen(kanalId: number, benutzerId: number) {
  const kanal = await prisma.kommunikationsKanal.findUnique({ where: { id: kanalId } });
  if (!kanal || !kanal.aktiv || !kanalErlaubt(kanal, benutzerId)) return null;
  return kanal;
}

async function interneMailBenachrichtigung(empfaenger: string, absender: string, betreff: string) {
  const nachname = empfaenger.split("@")[0]?.toLowerCase();
  if (!nachname) return;
  const benutzer = await prisma.benutzer.findFirst({
    where: { aktiv: true, nachname: { equals: nachname, mode: "insensitive" } },
    select: { id: true },
  });
  if (!benutzer) return;
  await prisma.interneBenachrichtigung.create({
    data: {
      titel: "Neue E-Mail",
      nachricht: `${absender}: ${betreff}`,
      typ: "MAIL",
      benutzerId: benutzer.id,
      erstelltVon: absender,
    },
  });
}

export async function GET() {
  const benutzer = await aktuellerBenutzer();
  if (!benutzer) return NextResponse.json({ fehler: "Nicht angemeldet." }, { status: 401 });

  await demoSicherstellen(benutzer);
  const eigeneMail = benutzerMail(benutzer.nachname, benutzer.vorname);
  const jetzt = new Date();

  const [mails, alleKanaele, meldungen, benutzerListe, sitzungen] = await Promise.all([
    prisma.novaMail.findMany({
      where: {
        OR: [
          { benutzerId: benutzer.id },
          { empfaenger: { contains: eigeneMail, mode: "insensitive" } },
          { absender: { equals: eigeneMail, mode: "insensitive" } },
        ],
      },
      orderBy: [{ empfangenAm: "desc" }, { gesendetAm: "desc" }],
      take: 300,
    }),
    prisma.kommunikationsKanal.findMany({
      where: { aktiv: true },
      include: { nachrichten: { orderBy: { erstelltAm: "asc" }, take: 300 } },
      orderBy: [{ typ: "asc" }, { name: "asc" }],
    }),
    prisma.interneBenachrichtigung.findMany({
      where: { benutzerId: benutzer.id },
      orderBy: { erstelltAm: "desc" },
      take: 100,
    }),
    prisma.benutzer.findMany({
      where: { aktiv: true },
      select: {
        id: true,
        vorname: true,
        nachname: true,
        personalnummer: true,
        abteilung: true,
        rollenprofilCode: true,
        letzteAnmeldungAm: true,
      },
      orderBy: [{ vorname: "asc" }, { nachname: "asc" }],
    }),
    prisma.benutzerSitzung.findMany({
      where: { laeuftAbAm: { gt: jetzt } },
      select: { benutzerId: true, letzteNutzungAm: true },
    }),
  ]);

  const aktiveIds = new Set(sitzungen.map((sitzung) => sitzung.benutzerId));
  const kanaele = alleKanaele
    .filter((kanal) => kanalErlaubt(kanal, benutzer.id))
    .map((kanal) => ({
      ...kanal,
      mitglieder: mitgliederLesen(kanal.mitgliederJson),
      nachrichten: kanal.nachrichten.map((nachricht) => ({
        ...nachricht,
        ...chatMetaLesen(nachricht.anhangJson),
      })),
    }));

  return NextResponse.json({
    benutzer: { ...benutzer, email: eigeneMail },
    benutzerListe: benutzerListe.map((eintrag) => ({
      ...eintrag,
      email: benutzerMail(eintrag.nachname, eintrag.vorname),
      online: aktiveIds.has(eintrag.id),
    })),
    mails: mails.map((mail) => ({ ...mail, anhaenge: anhaengeLesen(mail.anhangJson) })),
    kanaele,
    meldungen,
    smtpKonfiguriert: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER),
  });
}

export async function POST(request: NextRequest) {
  const benutzer = await aktuellerBenutzer();
  if (!benutzer) return NextResponse.json({ fehler: "Nicht angemeldet." }, { status: 401 });

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const aktion = alsText(body.aktion);
    const eigeneMail = benutzerMail(benutzer.nachname, benutzer.vorname);
    const vollerName = `${benutzer.vorname} ${benutzer.nachname}`.trim();

    if (aktion === "mail-speichern" || aktion === "mail-senden") {
      const empfaenger = alsText(body.empfaenger);
      const betreff = alsText(body.betreff, "Ohne Betreff");
      const inhalt = alsText(body.inhalt);
      const absender = alsText(body.absender, eigeneMail);
      const anhaenge = Array.isArray(body.anhaenge) ? body.anhaenge : [];
      if (!empfaenger || !inhalt) {
        return NextResponse.json({ fehler: "Empfänger und Nachricht sind erforderlich." }, { status: 400 });
      }

      const istEntwurf = aktion === "mail-speichern";
      const nachrichtenId = `mail-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const mail = await prisma.novaMail.create({
        data: {
          nachrichtenId,
          absender,
          empfaenger,
          cc: alsText(body.cc) || null,
          betreff,
          inhalt,
          ordner: istEntwurf ? "ENTWURF" : "GESENDET",
          gelesen: true,
          anhangJson: JSON.stringify(anhaenge),
          bezugTyp: alsText(body.bezugTyp) || null,
          bezugId: alsText(body.bezugId) || null,
          benutzerId: benutzer.id,
          gesendetAm: istEntwurf ? null : new Date(),
        },
      });

      if (!istEntwurf && empfaenger.toLowerCase().endsWith("@nova-test.de")) {
        const zielNachname = empfaenger.split("@")[0];
        const ziel = await prisma.benutzer.findFirst({
          where: { aktiv: true, nachname: { equals: zielNachname, mode: "insensitive" } },
          select: { id: true },
        });
        if (ziel && ziel.id !== benutzer.id) {
          await prisma.novaMail.create({
            data: {
              nachrichtenId: `${nachrichtenId}-in-${ziel.id}`,
              absender,
              empfaenger,
              cc: alsText(body.cc) || null,
              betreff,
              inhalt,
              ordner: "POSTEINGANG",
              gelesen: false,
              anhangJson: JSON.stringify(anhaenge),
              bezugTyp: alsText(body.bezugTyp) || null,
              bezugId: alsText(body.bezugId) || null,
              benutzerId: ziel.id,
            },
          });
          await interneMailBenachrichtigung(empfaenger, absender, betreff);
        }
      }
      return NextResponse.json({ mail });
    }

    if (["mail-gelesen", "mail-wichtig", "mail-verschieben", "mail-loeschen"].includes(aktion)) {
      const mailId = alsId(body.mailId);
      if (!mailId) return NextResponse.json({ fehler: "Ungültige Mail." }, { status: 400 });
      if (aktion === "mail-loeschen") {
        await prisma.novaMail.delete({ where: { id: mailId } });
      } else {
        await prisma.novaMail.update({
          where: { id: mailId },
          data:
            aktion === "mail-gelesen"
              ? { gelesen: true }
              : aktion === "mail-wichtig"
                ? { wichtig: Boolean(body.wichtig) }
                : { ordner: alsText(body.ordner, "POSTEINGANG") },
        });
      }
      return NextResponse.json({ ok: true });
    }

    if (aktion === "kanal-erstellen") {
      const partnerIds = Array.isArray(body.partnerIds)
        ? body.partnerIds.map(alsId).filter((id): id is number => id !== null)
        : [];
      const alleMitglieder = Array.from(new Set([benutzer.id, ...partnerIds]));
      if (alleMitglieder.length < 2) {
        return NextResponse.json({ fehler: "Mindestens ein weiterer Mitarbeiter ist erforderlich." }, { status: 400 });
      }
      const typ = alleMitglieder.length > 2 ? "GRUPPE" : "DIREKT";
      const name = alsText(body.name) || (typ === "GRUPPE" ? "Neue Gruppe" : "Direktnachricht");
      const kanal = await prisma.kommunikationsKanal.create({
        data: {
          name,
          typ,
          beschreibung: alsText(body.beschreibung) || null,
          erstelltVonId: benutzer.id,
          mitgliederJson: JSON.stringify(alleMitglieder),
        },
      });
      return NextResponse.json({ kanal });
    }

    if (aktion === "chat-senden") {
      const kanalId = alsId(body.kanalId);
      const inhalt = alsText(body.inhalt);
      const dateien = Array.isArray(body.anhaenge) ? (body.anhaenge as Anhang[]) : [];
      if (!kanalId || (!inhalt && dateien.length === 0)) {
        return NextResponse.json({ fehler: "Nachricht oder Datei fehlt." }, { status: 400 });
      }
      const kanal = await kanalPruefen(kanalId, benutzer.id);
      if (!kanal) return NextResponse.json({ fehler: "Kanal nicht verfügbar." }, { status: 403 });
      const nachricht = await prisma.kommunikationsNachricht.create({
        data: {
          kanalId,
          absenderId: benutzer.id,
          absender: vollerName,
          inhalt,
          anhangJson: JSON.stringify({ dateien, reaktionen: {} }),
        },
      });

      const erwaehnungen = inhalt.match(/@[\p{L}-]+/gu) ?? [];
      if (erwaehnungen.length > 0) {
        const personen = await prisma.benutzer.findMany({ where: { aktiv: true } });
        for (const person of personen) {
          if (erwaehnungen.some((tag) => slug(tag.slice(1)) === slug(person.nachname))) {
            await prisma.interneBenachrichtigung.create({
              data: {
                titel: `Erwähnung in ${kanal.name}`,
                nachricht: `${vollerName}: ${inhalt.slice(0, 140)}`,
                typ: "CHAT",
                benutzerId: person.id,
                erstelltVon: vollerName,
              },
            });
          }
        }
      }
      return NextResponse.json({ nachricht });
    }

    if (["chat-bearbeiten", "chat-loeschen", "chat-reaktion"].includes(aktion)) {
      const nachrichtId = alsId(body.nachrichtId);
      if (!nachrichtId) return NextResponse.json({ fehler: "Ungültige Nachricht." }, { status: 400 });
      const nachricht = await prisma.kommunikationsNachricht.findUnique({ where: { id: nachrichtId } });
      if (!nachricht) return NextResponse.json({ fehler: "Nachricht nicht gefunden." }, { status: 404 });
      const kanal = await kanalPruefen(nachricht.kanalId, benutzer.id);
      if (!kanal) return NextResponse.json({ fehler: "Nicht erlaubt." }, { status: 403 });

      if (aktion === "chat-loeschen") {
        if (nachricht.absenderId !== benutzer.id) return NextResponse.json({ fehler: "Nicht erlaubt." }, { status: 403 });
        await prisma.kommunikationsNachricht.delete({ where: { id: nachrichtId } });
      } else if (aktion === "chat-bearbeiten") {
        if (nachricht.absenderId !== benutzer.id) return NextResponse.json({ fehler: "Nicht erlaubt." }, { status: 403 });
        await prisma.kommunikationsNachricht.update({
          where: { id: nachrichtId },
          data: { inhalt: alsText(body.inhalt), bearbeitet: true },
        });
      } else {
        const emoji = alsText(body.emoji);
        const meta = chatMetaLesen(nachricht.anhangJson);
        const personen = new Set(meta.reaktionen[emoji] ?? []);
        const kennung = String(benutzer.id);
        personen.has(kennung) ? personen.delete(kennung) : personen.add(kennung);
        meta.reaktionen[emoji] = Array.from(personen);
        await prisma.kommunikationsNachricht.update({
          where: { id: nachrichtId },
          data: { anhangJson: JSON.stringify(meta) },
        });
      }
      return NextResponse.json({ ok: true });
    }

    if (aktion === "meldung-gelesen") {
      const meldungId = alsId(body.meldungId);
      if (!meldungId) return NextResponse.json({ fehler: "Ungültige Meldung." }, { status: 400 });
      await prisma.interneBenachrichtigung.update({
        where: { id: meldungId },
        data: { gelesen: true, gelesenAm: new Date() },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ fehler: "Unbekannte Aktion." }, { status: 400 });
  } catch (fehler) {
    console.error("NOVA Connect:", fehler);
    return NextResponse.json({ fehler: "NOVA Connect konnte die Aktion nicht ausführen." }, { status: 500 });
  }
}
