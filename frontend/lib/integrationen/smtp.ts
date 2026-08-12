import "server-only";
import nodemailer from "nodemailer";

export function smtpKonfiguriert() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

function transport() {
  return nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT), secure: process.env.SMTP_SECURE === "true", auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } });
}

export async function externeMailSenden(daten: { von?: string; an: string; cc?: string | null; betreff: string; inhalt: string }) {
  if (!smtpKonfiguriert()) return { versendet: false, modus: "VORSCHAU" as const };
  const ergebnis = await transport().sendMail({ from: process.env.SMTP_FROM || daten.von || process.env.SMTP_USER, to: daten.an, cc: daten.cc || undefined, subject: daten.betreff, text: daten.inhalt });
  return { versendet: true, modus: "SMTP" as const, nachrichtenId: ergebnis.messageId };
}

export async function smtpPruefen() {
  if (!smtpKonfiguriert()) return false;
  return transport().verify();
}
