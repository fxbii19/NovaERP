"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, Eye, Languages, Monitor, Moon, Palette, Sun, Type } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import NovaButton from "@/components/ui/NovaButton";
import type { Akzentfarbe, SchriftGroesse, SpracheRegion, ThemeModus } from "@/lib/theme";
import { einstellungenText } from "@/lib/einstellungen-i18n";

const AKZENTFARBEN: Array<{ wert: Akzentfarbe; name: string; farbe: string; verlauf: string }> = [
  { wert: "purple", name: "NOVA Standard", farbe: "#6366f1 → #9333ea", verlauf: "linear-gradient(135deg, #4f46e5, #9333ea)" },
  { wert: "cyan", name: "NOVA Cyan", farbe: "#06b6d4 → #2563eb", verlauf: "linear-gradient(135deg, #06b6d4, #2563eb)" },
  { wert: "blue", name: "Blau", farbe: "#3b82f6 → #6366f1", verlauf: "linear-gradient(135deg, #3b82f6, #6366f1)" },
  { wert: "emerald", name: "Smaragd", farbe: "#10b981 → #06b6d4", verlauf: "linear-gradient(135deg, #10b981, #06b6d4)" },
  { wert: "orange", name: "Orange", farbe: "#f97316 → #f59e0b", verlauf: "linear-gradient(135deg, #f97316, #f59e0b)" },
  { wert: "red", name: "Rot", farbe: "#ef4444 → #f97316", verlauf: "linear-gradient(135deg, #ef4444, #f97316)" },
];

const NEUE_AKZENTFARBEN: Array<{ wert: Akzentfarbe; name: string; farbe: string; verlauf: string }> = [
  { wert: "pearl-stone", name: "Pearl Stone", farbe: "#F5F6F7 bis #2F2F33", verlauf: "linear-gradient(135deg, #F5F6F7, #2F2F33)" },
  { wert: "laser-teal", name: "Laser Teal", farbe: "#2EF2E2 bis #0F2F2F", verlauf: "linear-gradient(135deg, #2EF2E2, #0F2F2F)" },
  { wert: "lime-green", name: "Lime Green", farbe: "#A4F000 bis #003F3A", verlauf: "linear-gradient(135deg, #A4F000, #003F3A)" },
  { wert: "sunset-blue", name: "Sunset Blue", farbe: "#FF9E6D bis #1A2238", verlauf: "linear-gradient(135deg, #FF9E6D, #1A2238)" },
  { wert: "kiwi-night", name: "Kiwi Night", farbe: "#222222 bis #89E900", verlauf: "linear-gradient(135deg, #222222, #89E900)" },
  { wert: "ghost-persian", name: "Ghost Persian", farbe: "#F7F7FF bis #27187E", verlauf: "linear-gradient(135deg, #F7F7FF, #27187E)" },
  { wert: "cyprus-sand", name: "Cyprus Sand", farbe: "#004643 bis #F0EDE5", verlauf: "linear-gradient(135deg, #004643, #F0EDE5)" },
  { wert: "plum-milk", name: "Plum Milk", farbe: "#381932 bis #FFF3E6", verlauf: "linear-gradient(135deg, #381932, #FFF3E6)" },
  { wert: "soft-olive", name: "Soft Olive", farbe: "#ACC8A2 bis #1A2517", verlauf: "linear-gradient(135deg, #ACC8A2, #1A2517)" },
  { wert: "pumpkin", name: "Pumpkin", farbe: "#FD802E bis #233D4C", verlauf: "linear-gradient(135deg, #FD802E, #233D4C)" },
  { wert: "sky", name: "Sky", farbe: "#2872A1 bis #CBDEE9", verlauf: "linear-gradient(135deg, #2872A1, #CBDEE9)" },
  { wert: "peace-mist", name: "Peace Mist", farbe: "#FFD2C2 bis #789A99", verlauf: "linear-gradient(135deg, #FFD2C2, #789A99)" },
  { wert: "chill-pink", name: "Chill Pink", farbe: "#FD1843 bis #FFF9FA", verlauf: "linear-gradient(135deg, #FD1843, #FFF9FA)" },
];

const ALLE_AKZENTFARBEN = [
  ...AKZENTFARBEN.map((farbe) =>
    farbe.wert === "cyan"
      ? { ...farbe, farbe: "#017374 bis #C2ECE2", verlauf: "linear-gradient(135deg, #017374, #C2ECE2)" }
      : farbe
  ),
  ...NEUE_AKZENTFARBEN,
];

const DESIGNMODI: Array<{ wert: ThemeModus; titel: string; text: string; icon: typeof Moon }> = [
  { wert: "dark", titel: "Dunkel", text: "Dunkle Oberfläche für konzentriertes Arbeiten.", icon: Moon },
  { wert: "light", titel: "Hell", text: "Helle Oberfläche für gut beleuchtete Arbeitsplätze.", icon: Sun },
  { wert: "system", titel: "System", text: "Übernimmt automatisch die Windows-Einstellung.", icon: Monitor },
];

const SCHRIFTEN: Array<{ wert: SchriftGroesse; titel: string; beispiel: string }> = [
  { wert: "klein", titel: "Klein", beispiel: "Kompakte Darstellung mit mehr Inhalt" },
  { wert: "normal", titel: "Normal", beispiel: "Ausgewogene NOVA-Standardgröße" },
  { wert: "gross", titel: "Groß", beispiel: "Besser lesbar auf großen Bildschirmen" },
];

const REGIONEN: Array<{ wert: SpracheRegion; titel: string; beschreibung: string }> = [
  { wert: "de-DE", titel: "Deutsch", beschreibung: "Deutschland · 1.234,56 € · TT.MM.JJJJ" },
  { wert: "en-GB", titel: "English", beschreibung: "United Kingdom · £1,234.56 · DD/MM/YYYY" },
  { wert: "es-ES", titel: "Español", beschreibung: "España · 1234,56 € · DD/MM/AAAA" },
  { wert: "tr-TR", titel: "Türkçe", beschreibung: "Türkiye · ₺1.234,56 · GG.AA.YYYY" },
  { wert: "it-IT", titel: "Italiano", beschreibung: "Italia · 1.234,56 € · GG/MM/AAAA" },
  { wert: "ru-RU", titel: "Русский", beschreibung: "Россия · 1 234,56 ₽ · ДД.ММ.ГГГГ" },
];

type Bereich = "design" | "akzent" | "schrift" | "region" | "vorschau";

export default function Darstellung() {
  const { einstellungen, gespeichert, geladen, aktualisieren, speichern, verwerfen, zuruecksetzen } = useTheme();
  const [offen, setOffen] = useState<Bereich | null>("design");
  const [erfolg, setErfolg] = useState(false);
  const t = (key: string) => einstellungenText(einstellungen.spracheRegion, key);
  const hatAenderungen = JSON.stringify(einstellungen) !== JSON.stringify(gespeichert);

  useEffect(() => {
    if (!erfolg) return;
    const timer = window.setTimeout(() => setErfolg(false), 2500);
    return () => window.clearTimeout(timer);
  }, [erfolg]);

  if (!geladen) return <div className="flex min-h-[400px] items-center justify-center text-[var(--nova-text-schwaecher)]">{t("loading")}</div>;

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
      <div><p className="font-semibold text-[var(--nova-akzent)]">{t("surface")}</p><h2 className="mt-1 text-3xl font-bold">{t("appearanceTitle")}</h2><p className="mt-2 max-w-2xl text-[var(--nova-text-schwaecher)]">{t("appearanceIntro")}</p></div>
      <div className="flex w-full flex-col gap-3 lg:w-72"><button type="button" onClick={zuruecksetzen} className="rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] px-5 py-3 font-semibold transition hover:bg-[var(--nova-flaeche-hover)]">{t("reset")}</button><NovaButton onClick={() => { speichern(); setErfolg(true); }} disabled={!hatAenderungen}>{t("save")}</NovaButton>{hatAenderungen && <button type="button" onClick={verwerfen} className="rounded-xl px-5 py-2 text-sm text-[var(--nova-text-schwaecher)] transition hover:bg-[var(--nova-flaeche-hover)]">{t("discard")}</button>}{erfolg && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-400">✓ {t("saved")}</div>}</div>
    </div>

    <AufklappBereich id="design" offen={offen === "design"} setzen={setOffen} titel={t("design")} text={t("designText")} icon={<Monitor className="h-5 w-5" />}>
      <div className="grid gap-4 md:grid-cols-3">{DESIGNMODI.map((option) => { const Icon = option.icon; const aktiv = einstellungen.modus === option.wert; return <button key={option.wert} type="button" onClick={() => aktualisieren({ modus: option.wert })} className={`rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 ${aktiv ? "border-[var(--nova-akzent)] bg-[var(--nova-akzent-transparent)]" : "border-[var(--nova-rand)] bg-[var(--nova-flaeche)] hover:bg-[var(--nova-flaeche-hover)]"}`}><Icon className="h-6 w-6 text-[var(--nova-akzent)]" /><p className="mt-3 font-semibold">{t(option.wert)}</p><p className="mt-1 text-sm text-[var(--nova-text-schwaecher)]">{t(`${option.wert}Text`)}</p></button>; })}</div>
    </AufklappBereich>

    <AufklappBereich id="akzent" offen={offen === "akzent"} setzen={setOffen} titel={t("accent")} text={t("accentText")} icon={<Palette className="h-5 w-5" />}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{ALLE_AKZENTFARBEN.map((farbe) => { const aktiv = einstellungen.akzentfarbe === farbe.wert; return <button key={farbe.wert} type="button" onClick={() => aktualisieren({ akzentfarbe: farbe.wert })} className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${aktiv ? "border-[var(--nova-akzent)] bg-[var(--nova-akzent-transparent)]" : "border-[var(--nova-rand)] bg-[var(--nova-flaeche)] hover:bg-[var(--nova-flaeche-hover)]"}`}><span className="h-10 w-10 shrink-0 rounded-full shadow-lg" style={{ backgroundImage: farbe.verlauf }} /><div><p className="font-semibold">{farbe.name}</p><p className="mt-1 text-xs text-[var(--nova-text-schwaecher)]">{farbe.farbe}</p></div></button>; })}</div>
    </AufklappBereich>

    <AufklappBereich id="schrift" offen={offen === "schrift"} setzen={setOffen} titel={t("font")} text={t("fontText")} icon={<Type className="h-5 w-5" />}>
      <div className="grid gap-4 md:grid-cols-3">{SCHRIFTEN.map((option) => { const key = option.wert === "klein" ? "small" : option.wert === "gross" ? "large" : "normal"; return <button key={option.wert} type="button" onClick={() => aktualisieren({ schriftgroesse: option.wert })} className={`rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 ${einstellungen.schriftgroesse === option.wert ? "border-[var(--nova-akzent)] bg-[var(--nova-akzent-transparent)]" : "border-[var(--nova-rand)] bg-[var(--nova-flaeche)] hover:bg-[var(--nova-flaeche-hover)]"}`}><p className={`${option.wert === "klein" ? "text-sm" : option.wert === "gross" ? "text-xl" : "text-base"} font-bold`}>{t(key)}</p><p className="mt-2 text-sm text-[var(--nova-text-schwaecher)]">{t(`${key}Text`)}</p></button>; })}</div>
    </AufklappBereich>

    <AufklappBereich id="region" offen={offen === "region"} setzen={setOffen} titel={t("language")} text={t("languageText")} icon={<Languages className="h-5 w-5" />}>
      <div className="grid gap-4 md:grid-cols-2">{REGIONEN.map((option) => <button key={option.wert} type="button" onClick={() => aktualisieren({ spracheRegion: option.wert })} className={`rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 ${einstellungen.spracheRegion === option.wert ? "border-[var(--nova-akzent)] bg-[var(--nova-akzent-transparent)]" : "border-[var(--nova-rand)] bg-[var(--nova-flaeche)] hover:bg-[var(--nova-flaeche-hover)]"}`}><p className="font-semibold">{option.titel}</p><p className="mt-2 text-sm text-[var(--nova-text-schwaecher)]">{option.beschreibung}</p></button>)}</div>
    </AufklappBereich>

    <AufklappBereich id="vorschau" offen={offen === "vorschau"} setzen={setOffen} titel={t("preview")} text={t("previewText")} icon={<Eye className="h-5 w-5" />}>
      <div className="overflow-hidden rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)]"><div className="flex min-h-64"><div className="w-20 border-r border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-3"><div className="nova-akzent-verlauf mb-6 flex h-10 items-center justify-center rounded-xl font-bold text-white">N</div><div className="space-y-3"><div className="h-10 rounded-lg bg-[var(--nova-akzent-transparent)]" /><div className="h-10 rounded-lg bg-[var(--nova-flaeche-hover)]" /><div className="h-10 rounded-lg bg-[var(--nova-flaeche-hover)]" /></div></div><div className="flex-1 p-6"><p className="text-sm font-semibold text-[var(--nova-akzent)]">NOVA ERP</p><h4 className="mt-2 text-2xl font-bold">{t("preview")}</h4><p className="mt-1 text-[var(--nova-text-schwaecher)]">{t("previewDescription")}</p><button type="button" className="nova-akzent-verlauf mt-5 rounded-lg px-4 py-2 font-semibold text-white transition">{t("exampleButton")}</button><div className="mt-5 rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-4"><b>{new Intl.DateTimeFormat(einstellungen.spracheRegion).format(new Date())}</b><span className="ml-5 text-[var(--nova-akzent)]">{new Intl.NumberFormat(einstellungen.spracheRegion, { style: "currency", currency: einstellungen.spracheRegion === "en-GB" ? "GBP" : einstellungen.spracheRegion === "tr-TR" ? "TRY" : "EUR" }).format(1234.56)}</span></div></div></div></div>
    </AufklappBereich>
  </div>;
}

function AufklappBereich({ id, offen, setzen, titel, text, icon, children }: { id: Bereich; offen: boolean; setzen: (id: Bereich | null) => void; titel: string; text: string; icon: ReactNode; children: ReactNode }) {
  return <section className="overflow-hidden rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)]"><button type="button" onClick={() => setzen(offen ? null : id)} className="flex w-full items-center gap-4 p-6 text-left transition hover:bg-[var(--nova-flaeche-hover)]"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--nova-akzent-transparent)] text-[var(--nova-akzent)]">{icon}</span><span className="min-w-0 flex-1"><span className="block text-xl font-bold">{titel}</span><span className="mt-1 block text-sm text-[var(--nova-text-schwaecher)]">{text}</span></span><ChevronDown className={`h-5 w-5 text-[var(--nova-text-schwaecher)] transition-transform duration-300 ${offen ? "rotate-180" : ""}`} /></button><div className={`grid transition-[grid-template-rows] duration-300 ease-out ${offen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}><div className="overflow-hidden"><div className="border-t border-[var(--nova-rand)] p-6">{children}</div></div></div></section>;
}
