"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Clock3, KeyRound, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ThemeProvider";
import { einstellungenText } from "@/lib/einstellungen-i18n";

export default function Sicherheit() {
  const { logout } = useAuth();
  const { einstellungen } = useTheme();
  const t = (key: string) => einstellungenText(einstellungen.spracheRegion, key);
  const [letzteAnmeldung, setLetzteAnmeldung] = useState<string | null>(null);
  const [alt, setAlt] = useState(""); const [neu, setNeu] = useState(""); const [wiederholung, setWiederholung] = useState("");
  const [meldung, setMeldung] = useState(""); const [fehler, setFehler] = useState(""); const [sendet, setSendet] = useState(false);

  useEffect(() => { fetch("/api/auth/security", { cache: "no-store" }).then((r) => r.json()).then((d) => setLetzteAnmeldung(d.letzteAnmeldungAm ?? null)).catch(() => undefined); }, []);

  async function passwortAendern(event: FormEvent) {
    event.preventDefault(); setFehler(""); setMeldung("");
    if (neu !== wiederholung) return setFehler(t("passwordsMismatch"));
    setSendet(true);
    try { const response = await fetch("/api/auth/security", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aktuellesPasswort: alt, neuesPasswort: neu }) }); const daten = await response.json(); if (!response.ok) throw new Error(daten.fehler); setAlt(""); setNeu(""); setWiederholung(""); setMeldung(t("passwordChanged")); } catch (error) { setFehler(error instanceof Error ? error.message : t("passwordChangeFailed")); } finally { setSendet(false); }
  }

  return <div><h2 className="text-2xl font-bold">{t("security")}</h2><p className="mt-2 text-[var(--nova-text-schwaecher)]">{t("securityText")}</p><div className="mt-8 space-y-4">
    <section className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)]/40 p-5"><div className="flex items-center gap-3"><KeyRound className="h-5 w-5 text-[var(--nova-akzent)]"/><h3 className="font-semibold">{t("changePassword")}</h3></div><form onSubmit={passwortAendern} className="mt-5 grid gap-4 md:grid-cols-3"><PasswortFeld label={t("currentPassword")} wert={alt} setzen={setAlt}/><PasswortFeld label={t("newPassword")} wert={neu} setzen={setNeu}/><PasswortFeld label={t("repeatPassword")} wert={wiederholung} setzen={setWiederholung}/><button disabled={sendet} className="rounded-xl bg-[var(--nova-akzent)] px-5 py-3 font-semibold text-white transition hover:bg-[var(--nova-akzent-hover)] disabled:opacity-50 md:col-start-3">{sendet ? t("saving") : t("changePassword")}</button></form>{fehler && <p className="mt-4 text-sm text-red-400">{fehler}</p>}{meldung && <p className="mt-4 text-sm text-emerald-400">✓ {meldung}</p>}</section>
    <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)]/40 p-5"><Clock3 className="h-5 w-5 text-[var(--nova-akzent)]"/><div className="flex-1"><h3 className="font-semibold">{t("lastLogin")}</h3><p className="mt-1 text-sm text-[var(--nova-text-schwaecher)]">{letzteAnmeldung ? new Date(letzteAnmeldung).toLocaleString(einstellungen.spracheRegion) : t("notAvailable")}</p></div></section>
    <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-red-500/25 bg-red-500/5 p-5"><LogOut className="h-5 w-5 text-red-400"/><div className="flex-1"><h3 className="font-semibold">{t("endSession")}</h3><p className="mt-1 text-sm text-[var(--nova-text-schwaecher)]">{t("endSessionText")}</p></div><button type="button" onClick={() => void logout("/login")} className="rounded-xl bg-red-500 px-4 py-2 font-semibold text-white transition hover:bg-red-600">{t("endSession")}</button></section>
  </div></div>;
}

function PasswortFeld({ label, wert, setzen }: { label: string; wert: string; setzen: (wert: string) => void }) { return <label className="text-sm"><span className="mb-2 block text-[var(--nova-text-schwaecher)]">{label}</span><input required minLength={4} type="password" value={wert} onChange={(e) => setzen(e.target.value)} className="w-full rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] px-4 py-3 outline-none focus:border-[var(--nova-akzent)]"/></label>; }
