"use client";

import { useEffect, useState } from "react";
import { BellRing, Volume2 } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { einstellungenText } from "@/lib/einstellungen-i18n";

const SPEICHER = "nova-benachrichtigungen";
type TonTyp = "nova" | "sanft" | "glocke" | "alarm";

const TOENE: Array<{ wert: TonTyp; name: string }> = [
  { wert: "nova", name: "NOVA Standard" },
  { wert: "sanft", name: "Sanfter Hinweis" },
  { wert: "glocke", name: "Helle Glocke" },
  { wert: "alarm", name: "Wichtige Warnung" },
];

export default function Benachrichtigungen() {
  const { einstellungen } = useTheme();
  const t = (key: string) => einstellungenText(einstellungen.spracheRegion, key);
  const [desktop, setDesktop] = useState(false);
  const [sounds, setSounds] = useState(true);
  const [ton, setTon] = useState<TonTyp>("nova");
  const [geladen, setGeladen] = useState(false);
  const [berechtigung, setBerechtigung] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    const gespeichert = JSON.parse(localStorage.getItem(SPEICHER) ?? "{}") as { desktop?: boolean; sounds?: boolean; ton?: TonTyp };
    setDesktop(Boolean(gespeichert.desktop));
    setSounds(gespeichert.sounds ?? true);
    setTon(TOENE.some((eintrag) => eintrag.wert === gespeichert.ton) ? gespeichert.ton! : "nova");
    setBerechtigung("Notification" in window ? Notification.permission : "unsupported");
    setGeladen(true);
  }, []);

  function speichern(neuDesktop: boolean, neuSounds: boolean, neuerTon: TonTyp = ton) {
    localStorage.setItem(SPEICHER, JSON.stringify({ desktop: neuDesktop, sounds: neuSounds, ton: neuerTon }));
  }

  async function desktopUmschalten() {
    if (!("Notification" in window)) return;
    let erlaubt = Notification.permission;
    if (!desktop && erlaubt === "default") erlaubt = await Notification.requestPermission();
    setBerechtigung(erlaubt);
    const neu = !desktop && erlaubt === "granted";
    setDesktop(neu);
    speichern(neu, sounds);
  }

  function soundsUmschalten() {
    const neu = !sounds;
    setSounds(neu);
    speichern(desktop, neu);
    if (neu) testTon(ton);
  }

  function tonWaehlen(neuerTon: TonTyp) {
    setTon(neuerTon);
    speichern(desktop, sounds, neuerTon);
    testTon(neuerTon);
  }

  function testTon(tonTyp: TonTyp = ton) {
    const AudioContextKlasse = window.AudioContext;
    const context = new AudioContextKlasse();
    const muster: Record<TonTyp, Array<[number, number, number]>> = {
      nova: [[520, 0, 0.15], [700, 0.16, 0.18]],
      sanft: [[440, 0, 0.32]],
      glocke: [[880, 0, 0.12], [1175, 0.13, 0.22]],
      alarm: [[420, 0, 0.14], [330, 0.16, 0.14], [420, 0.32, 0.18]],
    };

    muster[tonTyp].forEach(([frequenz, start, dauer]) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = tonTyp === "sanft" ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(frequenz, context.currentTime + start);
      gain.gain.setValueAtTime(0.0001, context.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + start + dauer);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(context.currentTime + start);
      oscillator.stop(context.currentTime + start + dauer);
    });
  }

  if (!geladen) return null;

  return <div><h2 className="text-2xl font-bold">{t("notifications")}</h2><p className="mt-2 text-[var(--nova-text-schwaecher)]">{t("notificationsText")}</p><div className="mt-8 space-y-4">
    <Option icon={<BellRing className="h-5 w-5" />} titel={t("desktopNotifications")} text={t("desktopNotificationsText")} aktiv={desktop} status={berechtigung === "denied" ? t("permissionDenied") : desktop ? t("enabled") : t("disabled")} onToggle={() => void desktopUmschalten()}><button type="button" disabled={!desktop} onClick={() => new Notification(t("notificationTestTitle"), { body: t("notificationTestBody") })} className="rounded-xl border border-[var(--nova-rand)] px-4 py-2 text-sm transition hover:bg-[var(--nova-flaeche-hover)] disabled:opacity-40">{t("testNotification")}</button></Option>
    <Option icon={<Volume2 className="h-5 w-5" />} titel={t("sounds")} text={t("soundsText")} aktiv={sounds} status={sounds ? t("enabled") : t("disabled")} onToggle={soundsUmschalten}><div className="flex flex-wrap items-center justify-end gap-3"><label className="text-sm text-[var(--nova-text-schwaecher)]"><span className="sr-only">Benachrichtigungston</span><select disabled={!sounds} value={ton} onChange={(event) => tonWaehlen(event.target.value as TonTyp)} className="rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] px-4 py-2 text-[var(--nova-text)] outline-none transition focus:border-[var(--nova-akzent)] disabled:opacity-40">{TOENE.map((eintrag) => <option key={eintrag.wert} value={eintrag.wert}>{eintrag.name}</option>)}</select></label><button type="button" disabled={!sounds} onClick={() => testTon()} className="rounded-xl border border-[var(--nova-rand)] px-4 py-2 text-sm transition hover:border-[var(--nova-akzent)] hover:text-[var(--nova-akzent)] disabled:opacity-40">{t("testSound")}</button></div></Option>
  </div></div>;
}

function Option({ icon, titel, text, aktiv, status, onToggle, children }: { icon: React.ReactNode; titel: string; text: string; aktiv: boolean; status: string; onToggle: () => void; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)]/40 p-5"><div className="flex flex-wrap items-center gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--nova-akzent-transparent)] text-[var(--nova-akzent)]">{icon}</span><div className="min-w-0 flex-1"><h3 className="font-semibold">{titel}</h3><p className="mt-1 text-sm text-[var(--nova-text-schwaecher)]">{text}</p></div><span className={`text-sm font-medium ${aktiv ? "text-emerald-400" : "text-[var(--nova-text-schwaecher)]"}`}>{status}</span><button type="button" role="switch" aria-checked={aktiv} onClick={onToggle} className={`relative h-7 w-12 shrink-0 overflow-hidden rounded-full transition-colors ${aktiv ? "bg-[var(--nova-akzent)]" : "bg-[var(--nova-rand)]"}`}><span className={`absolute left-0 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${aktiv ? "translate-x-6" : "translate-x-1"}`} /></button></div><div className="mt-4 flex justify-end">{children}</div></section>;
}
