"use client";

import {
  Archive,
  Bell,
  Bot,
  Check,
  Download,
  File,
  FileText,
  Heart,
  Inbox,
  Mail,
  MailPlus,
  MessageCircle,
  Mic,
  MicOff,
  MoreHorizontal,
  Paperclip,
  PenLine,
  Phone,
  Plus,
  Reply,
  Search,
  Send,
  Share2,
  Smile,
  Star,
  Trash2,
  Users,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import Link from "next/link";
import { ClipboardEvent, DragEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type Modus = "mail" | "chat" | "team" | "dateien" | "besprechungen" | "ai" | "system" | "automatisch";
type Anhang = { name: string; url: string; typ?: string; groesse?: number };
type Benutzer = { id: number; vorname: string; nachname: string; personalnummer: string; abteilung: string; rollenprofilCode: string; email: string; online: boolean };
type NovaMail = { id: number; nachrichtenId: string; absender: string; empfaenger: string; cc?: string; betreff: string; inhalt: string; ordner: string; gelesen: boolean; wichtig: boolean; bezugTyp?: string; bezugId?: string; erstelltAm: string; gesendetAm?: string; empfangenAm?: string; anhaenge: Anhang[] };
type ChatNachricht = { id: number; kanalId: string; absenderId: number; absender: string; inhalt: string; bearbeitet: boolean; erstelltAm: string; dateien: Anhang[]; reaktionen: Record<string, string[]> };
type Kanal = { id: string; name: string; typ: string; beschreibung?: string; mitglieder: number[]; nachrichten: ChatNachricht[] };
type Meldung = { id: number; titel: string; nachricht: string; typ: string; gelesen: boolean; erstelltVon?: string; erstelltAm: string };
type ConnectDaten = { benutzer: Benutzer; benutzerListe: Benutzer[]; mails: NovaMail[]; kanaele: Kanal[]; meldungen: Meldung[]; smtpKonfiguriert: boolean; aktualisiertAm: string };

const navigation: Array<{ modus: Modus; label: string; icon: typeof Mail }> = [
  { modus: "mail", label: "NOVA Mail", icon: Mail },
  { modus: "chat", label: "Interner Chat", icon: MessageCircle },
  { modus: "team", label: "Teams", icon: Users },
  { modus: "dateien", label: "Dateien", icon: File },
  { modus: "besprechungen", label: "Besprechungen", icon: Video },
  { modus: "ai", label: "NOVA AI", icon: Bot },
  { modus: "system", label: "Systemmeldungen", icon: Bell },
  { modus: "automatisch", label: "Automatischer Versand", icon: Send },
];

const ordner = [
  { id: "POSTEINGANG", label: "Posteingang", icon: Inbox },
  { id: "GESENDET", label: "Gesendet", icon: Send },
  { id: "ENTWURF", label: "Entwürfe", icon: FileText },
  { id: "FAVORITEN", label: "Favoriten", icon: Star },
  { id: "PAPIERKORB", label: "Papierkorb", icon: Trash2 },
];

const mailVorlagen = [
  { name: "Liefertermin", betreff: "Rückfrage zum Liefertermin", text: "Guten Tag,\n\nbitte teilen Sie uns den aktuellen Liefertermin mit.\n\nVielen Dank und freundliche Grüße" },
  { name: "Auftragsbestätigung", betreff: "Auftragsbestätigung", text: "Guten Tag,\n\nvielen Dank für Ihre Bestellung. Im Anhang finden Sie die Auftragsbestätigung.\n\nFreundliche Grüße" },
  { name: "Interne Rückfrage", betreff: "Kurze Rückfrage", text: "Hallo,\n\nkannst du mir hierzu bitte kurz eine Rückmeldung geben?\n\nViele Grüße" },
];

const kartenKlasse = "rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] shadow-sm";
const feldKlasse = "w-full rounded-lg border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-3 py-2.5 text-sm text-[var(--nova-text)] outline-none transition focus:border-[var(--nova-akzent)]";
const buttonKlasse = "rounded-lg border border-[var(--nova-rand)] px-3 py-2 text-sm font-medium transition hover:border-[var(--nova-akzent)] hover:text-[var(--nova-akzent)]";

function datum(iso?: string) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

function dateigroesse(wert?: number) {
  if (!wert) return "";
  return wert > 1024 * 1024 ? `${(wert / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(wert / 1024)} KB`;
}

type ApiFehler = {
  fehler?: string;
  meldung?: string;
  details?: string;
};

async function apiAntwortLesen<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text.trim()) {
    throw new Error(
      response.status === 401
        ? "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an."
        : `NOVA Connect erhielt keine Serverantwort (HTTP ${response.status}).`
    );
  }

  let body: T & ApiFehler;

  try {
    body = JSON.parse(text) as T & ApiFehler;
  } catch {
    throw new Error(
      `NOVA Connect erhielt eine ungültige Serverantwort (HTTP ${response.status}).`
    );
  }

  if (!response.ok) {
    throw new Error(
      body.fehler ||
        body.meldung ||
        body.details ||
        "Die Aktion konnte nicht ausgeführt werden."
    );
  }

  return body;
}

export default function KommunikationModul({ modus = "mail" }: { modus?: Modus }) {
  const [daten, setDaten] = useState<ConnectDaten | null>(null);
  const [fehler, setFehler] = useState("");
  const [laden, setLaden] = useState(true);

  const ladenDaten = useCallback(async (leise = false) => {
    if (!leise) setLaden(true);
    try {
      const response = await fetch("/api/kommunikation", { cache: "no-store" });
      const body = await apiAntwortLesen<ConnectDaten>(response);
      setDaten(body);
      setFehler("");
    } catch (error) {
      setFehler(error instanceof Error ? error.message : "NOVA Connect konnte nicht geladen werden.");
    } finally {
      setLaden(false);
    }
  }, []);

  useEffect(() => {
    void ladenDaten();
    const timer = window.setInterval(() => void ladenDaten(true), 15_000);
    return () => window.clearInterval(timer);
  }, [ladenDaten]);

  async function aktion(payload: Record<string, unknown>) {
    const response = await fetch("/api/kommunikation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await apiAntwortLesen<Record<string, unknown>>(response);
    await ladenDaten(true);
    return body;
  }

  return (
    <main className="min-h-screen bg-[var(--nova-hintergrund)] text-[var(--nova-text)]">
      <div className="mx-auto max-w-[1500px] px-5 py-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--nova-akzent)]">Kommunikation</p>
            <h1 className="mt-1 text-3xl font-bold">NOVA Connect</h1>
            <p className="mt-1 text-sm text-[var(--nova-text-schwaecher)]">Alle Kommunikation. Ein System.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--nova-text-schwaecher)]">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Live verbunden
            {daten?.aktualisiertAm ? ` · ${datum(daten.aktualisiertAm)}` : ""}
          </div>
        </div>

        <nav className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {navigation.map(({ modus: ziel, label, icon: Icon }) => (
            <Link key={ziel} href={pfad(ziel)} className={`${buttonKlasse} flex shrink-0 items-center gap-2 ${modus === ziel ? "nova-akzent-verlauf border-transparent text-white" : ""}`}>
              <Icon className="h-4 w-4" /> {label}
            </Link>
          ))}
        </nav>

        {fehler && <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">{fehler}</div>}
        {laden && !daten ? <div className={`${kartenKlasse} p-8 text-center`}>NOVA Connect wird geladen …</div> : null}
        {daten && modus === "mail" && <MailBereich daten={daten} aktion={aktion} />}
        {daten && (modus === "chat" || modus === "team") && <ChatBereich daten={daten} aktion={aktion} nurTeams={modus === "team"} />}
        {daten && modus === "dateien" && <DateienBereich daten={daten} />}
        {daten && modus === "besprechungen" && <BesprechungenBereich daten={daten} />}
        {daten && modus === "ai" && <AiBereich daten={daten} />}
        {daten && modus === "system" && <SystemBereich daten={daten} aktion={aktion} />}
        {daten && modus === "automatisch" && <AutomatikBereich daten={daten} />}
      </div>
    </main>
  );
}

function pfad(modus: Modus) {
  const map: Record<Modus, string> = { mail: "/kommunikation", chat: "/kommunikation/chat", team: "/kommunikation/team", dateien: "/kommunikation/dateien", besprechungen: "/kommunikation/besprechungen", ai: "/kommunikation/ai", system: "/kommunikation/system", automatisch: "/kommunikation/automatisch" };
  return map[modus];
}

function MailBereich({ daten, aktion }: { daten: ConnectDaten; aktion: (payload: Record<string, unknown>) => Promise<unknown> }) {
  const [aktiverOrdner, setAktiverOrdner] = useState("POSTEINGANG");
  const [auswahl, setAuswahl] = useState<NovaMail | null>(null);
  const [verfassen, setVerfassen] = useState(false);
  const [suche, setSuche] = useState("");
  const [filter, setFilter] = useState("ALLE");
  const [empfaenger, setEmpfaenger] = useState("");
  const [cc, setCc] = useState("");
  const [betreff, setBetreff] = useState("");
  const [inhalt, setInhalt] = useState("");
  const [anhaenge, setAnhaenge] = useState<Anhang[]>([]);
  const [antwort, setAntwort] = useState("");
  const [hochladen, setHochladen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const mails = useMemo(() => daten.mails.filter((mail) => {
    const passtOrdner = aktiverOrdner === "FAVORITEN" ? mail.wichtig && mail.ordner !== "PAPIERKORB" : mail.ordner === aktiverOrdner;
    const text = `${mail.absender} ${mail.empfaenger} ${mail.betreff} ${mail.inhalt}`.toLowerCase();
    const passtFilter = filter === "ALLE" || (filter === "UNGELESEN" && !mail.gelesen) || (filter === "WICHTIG" && mail.wichtig) || (filter === "ANHANG" && mail.anhaenge.length > 0);
    return passtOrdner && text.includes(suche.toLowerCase()) && passtFilter;
  }), [daten.mails, aktiverOrdner, suche, filter]);

  async function dateienHochladen(files: FileList | File[]) {
    if (!files.length) return;
    setHochladen(true);
    try {
      const form = new FormData();
      Array.from(files).slice(0, 5).forEach((datei) => form.append("dateien", datei));
      const response = await fetch("/api/kommunikation/anhaenge", { method: "POST", body: form });
      const body = await apiAntwortLesen<{ anhaenge?: Anhang[] }>(response);
      setAnhaenge((alt) => [...alt, ...(body.anhaenge || [])].slice(0, 5));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Upload fehlgeschlagen.");
    } finally {
      setHochladen(false);
    }
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    void dateienHochladen(event.dataTransfer.files);
  }

  function neu(mail?: NovaMail) {
    setEmpfaenger(mail ? mail.absender : "");
    setCc("");
    setBetreff(mail ? `${mail.betreff.startsWith("Re:") ? "" : "Re: "}${mail.betreff}` : "");
    setInhalt(mail ? `\n\n--- Ursprüngliche Nachricht ---\n${mail.inhalt}` : "");
    setAnhaenge([]);
    setAntwort("");
    if (!mail) setAuswahl(null);
    setVerfassen(true);
  }

  function screenshotEinfuegen(event: ClipboardEvent<HTMLTextAreaElement>) {
    const dateien = Array.from(event.clipboardData.items)
      .filter((eintrag) => eintrag.kind === "file")
      .map((eintrag) => eintrag.getAsFile())
      .filter((datei): datei is File => datei !== null);

    if (dateien.length > 0) void dateienHochladen(dateien);
  }

  async function senden(entwurf = false) {
    try {
      await aktion({ aktion: entwurf ? "mail-speichern" : "mail-senden", empfaenger, cc, betreff, inhalt, anhaenge });
      setVerfassen(false);
      setEmpfaenger(""); setCc(""); setBetreff(""); setInhalt(""); setAnhaenge([]);
      setAktiverOrdner(entwurf ? "ENTWURF" : "GESENDET");
    } catch (error) { alert(error instanceof Error ? error.message : "E-Mail konnte nicht gespeichert werden."); }
  }

  async function mailOeffnen(mail: NovaMail) {
    setVerfassen(false);
    setAntwort("");
    setAnhaenge([]);
    setAuswahl(mail);
    if (!mail.gelesen && mail.ordner === "POSTEINGANG") await aktion({ aktion: "mail-gelesen", mailId: mail.id });
  }

  async function antwortSenden(mail: NovaMail) {
    if (!antwort.trim() || hochladen) return;

    try {
      await aktion({
        aktion: "mail-senden",
        empfaenger: mail.absender,
        cc: "",
        betreff: `${mail.betreff.startsWith("Re:") ? "" : "Re: "}${mail.betreff}`,
        inhalt: `${antwort.trim()}\n\n--- Ursprüngliche Nachricht ---\n${mail.inhalt}`,
        anhaenge,
      });
      setAntwort("");
      setAnhaenge([]);
      setAuswahl(null);
      setAktiverOrdner("GESENDET");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Antwort konnte nicht gesendet werden.");
    }
  }

  const editor = (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div><h3 className="font-bold">{auswahl ? "Antwort schreiben" : "Neue E-Mail"}</h3><p className="mt-1 text-xs text-[var(--nova-text-schwaecher)]">Direkt in NOVA Mail verfassen</p></div>
        <button type="button" onClick={() => setVerfassen(false)} className={buttonKlasse} title="Schließen"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid gap-3 md:grid-cols-2"><input value={empfaenger} onChange={(e) => setEmpfaenger(e.target.value)} placeholder="Empfänger" className={feldKlasse} /><input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="CC (optional)" className={feldKlasse} /></div>
      <div className="flex gap-2"><input value={betreff} onChange={(e) => setBetreff(e.target.value)} placeholder="Betreff" className={feldKlasse} /><select className={`${feldKlasse} w-48`} defaultValue="" onChange={(e) => { const vorlage = mailVorlagen.find((v) => v.name === e.target.value); if (vorlage) { setBetreff(vorlage.betreff); setInhalt(vorlage.text); } }}><option value="">Vorlage wählen</option>{mailVorlagen.map((v) => <option key={v.name}>{v.name}</option>)}</select></div>
      <textarea value={inhalt} onChange={(e) => setInhalt(e.target.value)} placeholder="Nachricht schreiben …" className={`${feldKlasse} min-h-52`} />
      <div onDrop={drop} onDragOver={(e) => e.preventDefault()} onClick={() => fileRef.current?.click()} className="cursor-pointer rounded-lg border border-dashed border-[var(--nova-rand)] p-4 text-center text-sm text-[var(--nova-text-schwaecher)] hover:border-[var(--nova-akzent)]"><Paperclip className="mx-auto mb-1 h-5 w-5" />{hochladen ? "Dateien werden hochgeladen …" : "Dateien oder Screenshots hier ablegen oder auswählen"}<input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => e.target.files && void dateienHochladen(e.target.files)} /></div>
      {anhaenge.length > 0 && <div className="flex flex-wrap gap-2">{anhaenge.map((datei) => <span key={datei.url} className="flex items-center gap-2 rounded-lg bg-[var(--nova-hintergrund)] px-3 py-2 text-xs"><File className="h-3.5 w-3.5" />{datei.name}<button onClick={() => setAnhaenge((alt) => alt.filter((a) => a.url !== datei.url))}><X className="h-3.5 w-3.5" /></button></span>)}</div>}
      <div className="flex justify-end gap-2"><button onClick={() => void senden(true)} className={buttonKlasse}>Als Entwurf speichern</button><button onClick={() => void senden(false)} disabled={!empfaenger || !betreff || !inhalt.trim()} className="nova-akzent-verlauf flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"><Send className="h-4 w-4" /> Senden</button></div>
    </div>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className={`${kartenKlasse} h-fit p-3`}>
        <button onClick={() => neu()} className="nova-akzent-verlauf mb-3 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold text-white"><MailPlus className="h-4 w-4" /> Neue E-Mail</button>
        <p className="mb-3 truncate px-2 text-xs font-semibold text-[var(--nova-text-schwaecher)]">{daten.benutzer.email}</p>
        {ordner.map(({ id, label, icon: Icon }) => {
          const anzahl = id === "FAVORITEN" ? daten.mails.filter((m) => m.wichtig && m.ordner !== "PAPIERKORB").length : daten.mails.filter((m) => m.ordner === id).length;
          return <button key={id} onClick={() => { setAktiverOrdner(id); setAuswahl(null); }} className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${aktiverOrdner === id ? "bg-[var(--nova-akzent-transparent)] text-[var(--nova-akzent)]" : "hover:bg-[var(--nova-hintergrund)]"}`}><Icon className="h-4 w-4" /><span className="flex-1 text-left">{label}</span><span>{anzahl}</span></button>;
        })}
      </aside>

      <section className={`${kartenKlasse} min-w-0 overflow-hidden`}>
        <div className="flex flex-wrap gap-2 border-b border-[var(--nova-rand)] p-3">
          <label className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-[var(--nova-text-schwaecher)]" /><input value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Mails durchsuchen …" className={`${feldKlasse} pl-9`} /></label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className={`${feldKlasse} w-auto`}><option value="ALLE">Alle Mails</option><option value="UNGELESEN">Ungelesen</option><option value="WICHTIG">Favoriten</option><option value="ANHANG">Mit Anhang</option></select>
        </div>
        <div className="grid min-h-[560px] xl:grid-cols-[minmax(320px,0.85fr)_minmax(420px,1.15fr)]">
          <div className="border-r border-[var(--nova-rand)]">
            {mails.length === 0 && <LeererBereich text="Keine passenden E-Mails vorhanden." />}
            {mails.map((mail) => <button key={mail.id} onClick={() => void mailOeffnen(mail)} className={`flex w-full gap-3 border-b border-[var(--nova-rand)] p-4 text-left transition hover:bg-[var(--nova-hintergrund)] ${auswahl?.id === mail.id ? "bg-[var(--nova-akzent-transparent)]" : ""}`}>
              <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${mail.gelesen ? "bg-transparent" : "bg-[var(--nova-akzent)]"}`} />
              <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><strong className="truncate text-sm">{mail.ordner === "GESENDET" ? mail.empfaenger : mail.absender}</strong>{mail.anhaenge.length > 0 && <Paperclip className="h-3.5 w-3.5" />}{mail.wichtig && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}</div><p className="mt-1 truncate text-sm">{mail.betreff || "(Kein Betreff)"}</p><p className="mt-1 truncate text-xs text-[var(--nova-text-schwaecher)]">{mail.inhalt}</p></div>
              <span className="shrink-0 text-[11px] text-[var(--nova-text-schwaecher)]">{datum(mail.empfangenAm || mail.gesendetAm || mail.erstelltAm)}</span>
            </button>)}
          </div>
          <div className="min-w-0 p-5">
            {!auswahl ? (verfassen ? editor : <LeererBereich icon={<Mail className="h-8 w-8" />} text="Wähle eine E-Mail aus, um die Unterhaltung zu öffnen." />) : <>
              <div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold">{auswahl.betreff || "(Kein Betreff)"}</h2><p className="mt-1 text-xs text-[var(--nova-text-schwaecher)]">Von {auswahl.absender} · an {auswahl.empfaenger}</p></div><div className="flex gap-1"><button title="Favorit" onClick={() => void aktion({ aktion: "mail-wichtig", mailId: auswahl.id, wichtig: !auswahl.wichtig })} className={buttonKlasse}><Star className={`h-4 w-4 ${auswahl.wichtig ? "fill-amber-400 text-amber-400" : ""}`} /></button><button title="Papierkorb" onClick={() => { void aktion({ aktion: "mail-verschieben", mailId: auswahl.id, ordner: "PAPIERKORB" }); setAuswahl(null); }} className={buttonKlasse}><Trash2 className="h-4 w-4" /></button></div></div>
              <div className="my-5 whitespace-pre-wrap rounded-lg bg-[var(--nova-hintergrund)] p-4 text-sm leading-6">{auswahl.inhalt}</div>
              {auswahl.anhaenge.length > 0 && <div className="mb-5 flex flex-wrap gap-2">{auswahl.anhaenge.map((datei) => <a key={datei.url} href={datei.url} download className={`${buttonKlasse} flex items-center gap-2`}><File className="h-4 w-4" /><span>{datei.name}</span><Download className="h-3.5 w-3.5" /></a>)}</div>}
              {auswahl.ordner !== "GESENDET" && <div className="border-t border-[var(--nova-rand)] pt-4">
                <textarea value={antwort} onChange={(e) => setAntwort(e.target.value)} onPaste={screenshotEinfuegen} placeholder="Antwort schreiben oder Screenshot mit Strg + V einfügen …" className={`${feldKlasse} min-h-28`} />
                {anhaenge.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{anhaenge.map((datei) => <span key={datei.url} className="flex items-center gap-2 rounded-lg bg-[var(--nova-hintergrund)] px-3 py-2 text-xs"><File className="h-3.5 w-3.5" />{datei.name}<button onClick={() => setAnhaenge((alt) => alt.filter((a) => a.url !== datei.url))}><X className="h-3.5 w-3.5" /></button></span>)}</div>}
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <button type="button" onClick={() => fileRef.current?.click()} className={`${buttonKlasse} flex items-center gap-2`}><Paperclip className="h-4 w-4" /> Dateien einfügen</button>
                  <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => e.target.files && void dateienHochladen(e.target.files)} />
                  <button type="button" onClick={() => void antwortSenden(auswahl)} disabled={!antwort.trim() || hochladen} className="nova-akzent-verlauf flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-40"><Reply className="h-4 w-4" /> {hochladen ? "Dateien werden geladen …" : "Antworten"}</button>
                </div>
              </div>}
            </>}
          </div>
        </div>
      </section>

    </div>
  );
}

function ChatBereich({ daten, aktion, nurTeams }: { daten: ConnectDaten; aktion: (payload: Record<string, unknown>) => Promise<unknown>; nurTeams: boolean }) {
  const sichtbareKanaele = daten.kanaele.filter((k) => nurTeams ? k.typ === "TEAM" : k.typ !== "TEAM" || k.name === "NOVA Allgemein");
  const [kanalId, setKanalId] = useState(sichtbareKanaele[0]?.id || "");
  const [text, setText] = useState("");
  const [dateien, setDateien] = useState<Anhang[]>([]);
  const [neu, setNeu] = useState(false);
  const [partner, setPartner] = useState<number[]>([]);
  const [name, setName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const kanal = sichtbareKanaele.find((k) => k.id === kanalId) || sichtbareKanaele[0];

  useEffect(() => { if (!sichtbareKanaele.some((k) => k.id === kanalId)) setKanalId(sichtbareKanaele[0]?.id || ""); }, [kanalId, sichtbareKanaele]);

  async function upload(files: FileList) {
    try {
      const form = new FormData();

      Array.from(files)
        .slice(0, 5)
        .forEach((datei) => form.append("dateien", datei));

      const response = await fetch("/api/kommunikation/anhaenge", {
        method: "POST",
        body: form,
      });
      const body = await apiAntwortLesen<{ anhaenge?: Anhang[] }>(response);

      setDateien((alt) => [...alt, ...(body.anhaenge || [])].slice(0, 5));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Upload fehlgeschlagen.");
    }
  }

  async function senden() {
    if (!kanal || (!text.trim() && !dateien.length)) return;
    await aktion({ aktion: "chat-senden", kanalId: kanal.id, inhalt: text, anhaenge: dateien }); setText(""); setDateien([]);
  }

  async function kanalErstellen() {
    if (!partner.length) return;
    const result = await aktion({ aktion: "kanal-erstellen", partnerIds: partner, name, beschreibung: nurTeams ? "Neuer Team-Bereich" : "Interne Unterhaltung" }) as { kanal?: Kanal };
    setNeu(false); setPartner([]); setName(""); if (result.kanal) setKanalId(result.kanal.id);
  }

  return <div className={`${kartenKlasse} grid min-h-[650px] overflow-hidden lg:grid-cols-[270px_minmax(0,1fr)]`}>
    <aside className="border-r border-[var(--nova-rand)] p-3"><div className="mb-3 flex items-center justify-between px-2"><strong>{nurTeams ? "Abteilungen" : "Unterhaltungen"}</strong><button onClick={() => setNeu(true)} className={buttonKlasse}><Plus className="h-4 w-4" /></button></div>{sichtbareKanaele.map((k) => <button key={k.id} onClick={() => setKanalId(k.id)} className={`mb-1 flex w-full items-center gap-3 rounded-lg p-3 text-left ${kanal?.id === k.id ? "bg-[var(--nova-akzent-transparent)] text-[var(--nova-akzent)]" : "hover:bg-[var(--nova-hintergrund)]"}`}><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--nova-hintergrund)]">{k.typ === "TEAM" ? <Users className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{k.name}</p><p className="truncate text-xs text-[var(--nova-text-schwaecher)]">{k.nachrichten.at(-1)?.inhalt || k.beschreibung || "Noch keine Nachrichten"}</p></div></button>)}
      <div className="mt-5 border-t border-[var(--nova-rand)] pt-4"><p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-[var(--nova-text-schwaecher)]">Online</p>{daten.benutzerListe.filter((b) => b.online).map((b) => <div key={b.id} className="flex items-center gap-2 px-2 py-1.5 text-xs"><span className="h-2 w-2 rounded-full bg-emerald-500" />{b.vorname} {b.nachname}</div>)}</div>
    </aside>
    <section className="flex min-w-0 flex-col">{!kanal ? <LeererBereich text="Erstelle eine Unterhaltung, um zu beginnen." /> : <><header className="flex items-center justify-between border-b border-[var(--nova-rand)] px-5 py-4"><div><h2 className="font-bold">{kanal.name}</h2><p className="text-xs text-[var(--nova-text-schwaecher)]">{kanal.beschreibung || `${kanal.mitglieder.length} Mitglieder`}</p></div><div className="flex gap-2"><button className={buttonKlasse} title="Audioanruf"><Phone className="h-4 w-4" /></button><Link href="/kommunikation/besprechungen" className={buttonKlasse} title="Videoanruf"><Video className="h-4 w-4" /></Link></div></header>
      <div className="flex-1 space-y-4 overflow-y-auto p-5">{kanal.nachrichten.length === 0 && <LeererBereich text="Noch keine Nachrichten. Schreib die erste Nachricht." />}{kanal.nachrichten.map((n) => { const eigen = n.absenderId === daten.benutzer.id; return <div key={n.id} className={`flex ${eigen ? "justify-end" : "justify-start"}`}><div className={`max-w-[78%] rounded-2xl px-4 py-3 ${eigen ? "nova-akzent-verlauf text-white" : "bg-[var(--nova-hintergrund)]"}`}><div className="mb-1 flex items-center gap-2 text-xs opacity-75"><strong>{n.absender}</strong><span>{datum(n.erstelltAm)}</span>{n.bearbeitet && <span>bearbeitet</span>}</div><p className="whitespace-pre-wrap text-sm">{n.inhalt}</p>{n.dateien.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{n.dateien.map((d) => <a key={d.url} href={d.url} download className="rounded-md bg-black/10 px-2 py-1 text-xs underline">{d.name}</a>)}</div>}<div className="mt-2 flex flex-wrap items-center gap-1">{Object.entries(n.reaktionen).map(([emoji, personen]) => <button key={emoji} onClick={() => void aktion({ aktion: "chat-reaktion", nachrichtId: n.id, emoji })} className="rounded-full bg-black/10 px-2 py-0.5 text-xs">{emoji} {personen.length}</button>)}<button onClick={() => void aktion({ aktion: "chat-reaktion", nachrichtId: n.id, emoji: "👍" })} className="rounded-full px-1 text-xs opacity-60 hover:bg-black/10">＋👍</button>{eigen && <><button onClick={() => { const wert = prompt("Nachricht bearbeiten", n.inhalt); if (wert?.trim()) void aktion({ aktion: "chat-bearbeiten", nachrichtId: n.id, inhalt: wert }); }} className="ml-1 opacity-60"><PenLine className="h-3.5 w-3.5" /></button><button onClick={() => confirm("Nachricht löschen?") && void aktion({ aktion: "chat-loeschen", nachrichtId: n.id })} className="opacity-60"><Trash2 className="h-3.5 w-3.5" /></button></>}</div></div></div>; })}</div>
      {text && <p className="px-5 pb-1 text-xs text-[var(--nova-text-schwaecher)]">Du schreibst gerade …</p>}
      <footer className="border-t border-[var(--nova-rand)] p-4">{dateien.length > 0 && <div className="mb-2 flex gap-2">{dateien.map((d) => <span key={d.url} className="rounded bg-[var(--nova-hintergrund)] px-2 py-1 text-xs">{d.name}</span>)}</div>}<div className="flex items-center gap-2"><input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => e.target.files && void upload(e.target.files)} /><button onClick={() => fileRef.current?.click()} className={buttonKlasse}><Paperclip className="h-4 w-4" /></button><input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void senden(); } }} placeholder={`Nachricht an ${kanal.name}`} className={feldKlasse} /><button className={buttonKlasse}><Smile className="h-4 w-4" /></button><button onClick={() => void senden()} className="nova-akzent-verlauf rounded-lg p-3 text-white"><Send className="h-4 w-4" /></button></div></footer></>}</section>
    {neu && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setNeu(false); }}><div className={`${kartenKlasse} w-full max-w-lg p-5`}><h2 className="text-lg font-bold">{nurTeams ? "Team erstellen" : "Unterhaltung starten"}</h2><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" className={`${feldKlasse} mt-4`} /><div className="mt-3 max-h-64 overflow-y-auto">{daten.benutzerListe.filter((b) => b.id !== daten.benutzer.id).map((b) => <label key={b.id} className="flex cursor-pointer items-center gap-3 border-b border-[var(--nova-rand)] p-3"><input type="checkbox" checked={partner.includes(b.id)} onChange={() => setPartner((alt) => alt.includes(b.id) ? alt.filter((id) => id !== b.id) : [...alt, b.id])} /><span className="h-2 w-2 rounded-full bg-emerald-500" /><span>{b.vorname} {b.nachname}<small className="block text-[var(--nova-text-schwaecher)]">{b.abteilung}</small></span></label>)}</div><div className="mt-4 flex justify-end gap-2"><button onClick={() => setNeu(false)} className={buttonKlasse}>Abbrechen</button><button onClick={() => void kanalErstellen()} className="nova-akzent-verlauf rounded-lg px-4 py-2 text-sm font-bold text-white">Erstellen</button></div></div></div>}
  </div>;
}

function DateienBereich({ daten }: { daten: ConnectDaten }) {
  const [suche, setSuche] = useState("");
  const dateien = useMemo(() => {
    const map = new Map<string, Anhang & { quelle: string; datum: string }>();
    daten.mails.forEach((m) => m.anhaenge.forEach((a) => map.set(a.url, { ...a, quelle: `Mail: ${m.betreff}`, datum: m.erstelltAm })));
    daten.kanaele.forEach((k) => k.nachrichten.forEach((n) => n.dateien.forEach((a) => map.set(a.url, { ...a, quelle: `Chat: ${k.name}`, datum: n.erstelltAm }))));
    return [...map.values()].filter((d) => `${d.name} ${d.quelle}`.toLowerCase().includes(suche.toLowerCase()));
  }, [daten, suche]);
  return <section><div className="mb-4 grid gap-4 md:grid-cols-3"><StatKarte label="Alle Dateien" wert={dateien.length} /><StatKarte label="Mail-Anhänge" wert={daten.mails.reduce((sum, m) => sum + m.anhaenge.length, 0)} /><StatKarte label="Chat-Dateien" wert={daten.kanaele.reduce((sum, k) => sum + k.nachrichten.reduce((s, n) => s + n.dateien.length, 0), 0)} /></div><div className={`${kartenKlasse} overflow-hidden`}><div className="border-b border-[var(--nova-rand)] p-4"><input value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Dateien durchsuchen …" className={feldKlasse} /></div>{dateien.length === 0 ? <LeererBereich text="Noch keine Dateien in NOVA Connect gespeichert." /> : <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">{dateien.map((d) => <a key={d.url} href={d.url} download className="flex items-center gap-3 rounded-xl border border-[var(--nova-rand)] p-4 transition hover:border-[var(--nova-akzent)]"><div className="rounded-lg bg-[var(--nova-akzent-transparent)] p-3 text-[var(--nova-akzent)]"><File className="h-5 w-5" /></div><div className="min-w-0 flex-1"><strong className="block truncate text-sm">{d.name}</strong><span className="block truncate text-xs text-[var(--nova-text-schwaecher)]">{d.quelle}</span><span className="text-[11px] text-[var(--nova-text-schwaecher)]">{dateigroesse(d.groesse)} · {datum(d.datum)}</span></div><Download className="h-4 w-4" /></a>)}</div>}</div></section>;
}

function BesprechungenBereich({ daten }: { daten: ConnectDaten }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [kamera, setKamera] = useState(false);
  const [mikro, setMikro] = useState(false);
  const [teilen, setTeilen] = useState(false);
  const [notizen, setNotizen] = useState("");

  async function kameraSchalten() {
    if (kamera) { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; if (videoRef.current) videoRef.current.srcObject = null; setKamera(false); setMikro(false); return; }
    try { const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); streamRef.current = stream; if (videoRef.current) videoRef.current.srcObject = stream; setKamera(true); setMikro(true); } catch { alert("Kamera oder Mikrofon konnte nicht geöffnet werden."); }
  }
  function mikroSchalten() { streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !mikro; }); setMikro(!mikro); }
  async function bildschirmTeilen() { try { const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }); if (videoRef.current) videoRef.current.srcObject = stream; setTeilen(true); stream.getVideoTracks()[0].onended = () => { setTeilen(false); if (videoRef.current) videoRef.current.srcObject = streamRef.current; }; } catch { /* Abbruch ist normal */ } }
  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  return <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]"><section className={`${kartenKlasse} overflow-hidden`}><div className="aspect-video bg-slate-950"><video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />{!kamera && !teilen && <div className="flex h-full items-center justify-center text-center text-slate-400"><div><Video className="mx-auto mb-3 h-12 w-12" /><p>Kamera ist ausgeschaltet</p></div></div>}</div><div className="flex flex-wrap items-center justify-center gap-3 p-4"><button onClick={mikroSchalten} disabled={!kamera} className={buttonKlasse}>{mikro ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}</button><button onClick={() => void kameraSchalten()} className={`rounded-lg p-3 text-white ${kamera ? "bg-red-500" : "nova-akzent-verlauf"}`}>{kamera ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}</button><button onClick={() => void bildschirmTeilen()} className={`${buttonKlasse} ${teilen ? "text-[var(--nova-akzent)]" : ""}`}><Share2 className="h-5 w-5" /></button></div></section><aside className="space-y-4"><div className={`${kartenKlasse} p-5`}><h2 className="font-bold">Teilnehmer</h2><div className="mt-3 space-y-2">{daten.benutzerListe.filter((b) => b.online).map((b) => <div key={b.id} className="flex items-center gap-3 rounded-lg bg-[var(--nova-hintergrund)] p-3"><span className="h-2 w-2 rounded-full bg-emerald-500" /><div><strong className="text-sm">{b.vorname} {b.nachname}</strong><small className="block text-[var(--nova-text-schwaecher)]">{b.abteilung}</small></div></div>)}</div></div><div className={`${kartenKlasse} p-5`}><h2 className="font-bold">Besprechungsnotizen</h2><textarea value={notizen} onChange={(e) => setNotizen(e.target.value)} placeholder="Entscheidungen, Aufgaben und Fristen notieren …" className={`${feldKlasse} mt-3 min-h-40`} /><p className="mt-2 text-xs text-[var(--nova-text-schwaecher)]">Audio, Video und Bildschirmfreigabe laufen im Browser. Für echte Gespräche zwischen mehreren Geräten folgt später die sichere WebRTC-Verbindung.</p></div></aside></div>;
}

function AiBereich({ daten }: { daten: ConnectDaten }) {
  const [anfrage, setAnfrage] = useState("");
  const [ergebnis, setErgebnis] = useState("");
  const [mailId, setMailId] = useState<number | "">(daten.mails[0]?.id || "");
  const mail = daten.mails.find((m) => m.id === Number(mailId));
  function analysieren(art: string) {
    if (!mail) return setErgebnis("Bitte zuerst eine E-Mail auswählen.");
    const nummern = `${mail.betreff} ${mail.inhalt}`.match(/(?:BE|LS|RE|AUF)-?[A-Z0-9-]+/gi) || [];
    const zusammenfassung = `E-Mail von ${mail.absender} zum Thema „${mail.betreff}“. ${mail.inhalt.slice(0, 220)}${mail.inhalt.length > 220 ? "…" : ""}`;
    if (art === "zusammenfassen") setErgebnis(`${zusammenfassung}\n\nErkannte ERP-Nummern: ${nummern.join(", ") || "keine"}.`);
    if (art === "antwort") setErgebnis(`Guten Tag,\n\nvielen Dank für Ihre Nachricht zum Thema „${mail.betreff}“. Wir prüfen den Vorgang und melden uns zeitnah mit einer verbindlichen Rückmeldung.\n\nFreundliche Grüße\n${daten.benutzer.vorname} ${daten.benutzer.nachname}\nNOVA ERP`);
    if (art === "zuordnen") setErgebnis(`Vorgeschlagene Zuordnung:\n• Absender: ${mail.absender}\n• Dokumenttyp: ${/rechnung/i.test(mail.inhalt + mail.betreff) ? "Rechnung" : /liefer/i.test(mail.inhalt + mail.betreff) ? "Lieferung / Lieferschein" : /bestell/i.test(mail.inhalt + mail.betreff) ? "Bestellung" : "Allgemeine Kommunikation"}\n• ERP-Referenz: ${nummern[0] || "manuell prüfen"}`);
  }
  function frei() { const text = anfrage.toLowerCase(); if (text.includes("heute") || text.includes("übersicht")) setErgebnis(`Heute liegen ${daten.mails.filter((m) => m.ordner === "POSTEINGANG" && !m.gelesen).length} ungelesene Mails, ${daten.meldungen.filter((m) => !m.gelesen).length} neue Systemmeldungen und ${daten.kanaele.reduce((s, k) => s + k.nachrichten.length, 0)} Chat-Nachrichten vor.`); else setErgebnis("Ich kann ausgewählte Mails zusammenfassen, Antworten vorbereiten und ERP-Bezüge erkennen. Für freie KI-Gespräche kann später wieder ein Sprachmodell verbunden werden."); }
  return <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]"><section className={`${kartenKlasse} p-6`}><div className="flex items-center gap-3"><div className="rounded-xl bg-[var(--nova-akzent-transparent)] p-3 text-[var(--nova-akzent)]"><Bot className="h-6 w-6" /></div><div><h2 className="text-xl font-bold">NOVA AI für Connect</h2><p className="text-sm text-[var(--nova-text-schwaecher)]">Kommunikation verstehen, strukturieren und vorbereiten.</p></div></div><select value={mailId} onChange={(e) => setMailId(Number(e.target.value))} className={`${feldKlasse} mt-6`}><option value="">E-Mail auswählen</option>{daten.mails.map((m) => <option key={m.id} value={m.id}>{m.absender} · {m.betreff}</option>)}</select><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => analysieren("zusammenfassen")} className={buttonKlasse}>Mail zusammenfassen</button><button onClick={() => analysieren("antwort")} className={buttonKlasse}>Antwort formulieren</button><button onClick={() => analysieren("zuordnen")} className={buttonKlasse}>ERP-Zuordnung erkennen</button></div><div className="mt-5 flex gap-2"><input value={anfrage} onChange={(e) => setAnfrage(e.target.value)} placeholder="NOVA etwas zur Kommunikation fragen …" className={feldKlasse} /><button onClick={frei} className="nova-akzent-verlauf rounded-lg px-4 text-white"><Send className="h-4 w-4" /></button></div><div className="mt-5 min-h-64 whitespace-pre-wrap rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] p-5 text-sm leading-6">{ergebnis || "Wähle eine Funktion oder stelle eine Frage."}</div></section><aside className={`${kartenKlasse} p-5`}><h2 className="font-bold">Was NOVA erkennt</h2><div className="mt-4 space-y-3">{["Lieferanten und Kunden", "Bestellungen und Aufträge", "Rechnungen und Lieferscheine", "Betreff und Dringlichkeit", "PDF- und Dateianhänge"].map((text) => <div key={text} className="flex items-center gap-3 rounded-lg bg-[var(--nova-hintergrund)] p-3 text-sm"><Check className="h-4 w-4 text-emerald-500" />{text}</div>)}</div></aside></div>;
}

function SystemBereich({ daten, aktion }: { daten: ConnectDaten; aktion: (payload: Record<string, unknown>) => Promise<unknown> }) {
  return <section className={`${kartenKlasse} overflow-hidden`}><div className="flex items-center justify-between border-b border-[var(--nova-rand)] p-5"><div><h2 className="text-lg font-bold">Systemmeldungen</h2><p className="text-sm text-[var(--nova-text-schwaecher)]">Mails, Freigaben und wichtige ERP-Ereignisse.</p></div><span className="rounded-full bg-[var(--nova-akzent-transparent)] px-3 py-1 text-sm text-[var(--nova-akzent)]">{daten.meldungen.filter((m) => !m.gelesen).length} ungelesen</span></div>{daten.meldungen.length === 0 ? <LeererBereich text="Keine Systemmeldungen vorhanden." /> : daten.meldungen.map((m) => <button key={m.id} onClick={() => void aktion({ aktion: "meldung-gelesen", meldungId: m.id })} className={`flex w-full items-start gap-4 border-b border-[var(--nova-rand)] p-5 text-left hover:bg-[var(--nova-hintergrund)] ${m.gelesen ? "opacity-60" : ""}`}><div className="rounded-lg bg-[var(--nova-akzent-transparent)] p-2 text-[var(--nova-akzent)]"><Bell className="h-5 w-5" /></div><div className="flex-1"><div className="flex items-center gap-2"><strong>{m.titel}</strong>{!m.gelesen && <span className="h-2 w-2 rounded-full bg-[var(--nova-akzent)]" />}</div><p className="mt-1 text-sm text-[var(--nova-text-schwaecher)]">{m.nachricht}</p><p className="mt-2 text-xs text-[var(--nova-text-schwaecher)]">{m.erstelltVon ? `${m.erstelltVon} · ` : ""}{datum(m.erstelltAm)}</p></div></button>)}</section>;
}

function AutomatikBereich({ daten }: { daten: ConnectDaten }) {
  const regeln = [
    { titel: "Bestellbestätigung", text: "Sendet nach Freigabe automatisch eine Bestätigung.", aktiv: true },
    { titel: "Versandinformation", text: "Informiert Kunden nach abgeschlossener Ladung.", aktiv: true },
    { titel: "Mindestbestand-Warnung", text: "Benachrichtigt Einkauf und Disposition bei kritischem Bestand.", aktiv: true },
    { titel: "QS-Sperrung", text: "Informiert Verantwortliche bei gesperrter Ware.", aktiv: true },
  ];
  return <section><div className="mb-4 grid gap-4 md:grid-cols-3"><StatKarte label="Aktive Regeln" wert={regeln.filter((r) => r.aktiv).length} /><StatKarte label="Heute versendet" wert={daten.mails.filter((m) => m.ordner === "GESENDET" && new Date(m.erstelltAm).toDateString() === new Date().toDateString()).length} /><StatKarte label="Mail-Server" wert={daten.smtpKonfiguriert ? "Verbunden" : "NOVA intern"} /></div><div className={`${kartenKlasse} p-5`}><h2 className="text-lg font-bold">Automatische Kommunikation</h2><p className="mt-1 text-sm text-[var(--nova-text-schwaecher)]">Regeln verbinden ERP-Ereignisse direkt mit NOVA Connect.</p><div className="mt-5 grid gap-3 md:grid-cols-2">{regeln.map((r) => <div key={r.titel} className="flex items-start gap-4 rounded-xl border border-[var(--nova-rand)] p-4"><div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500"><Send className="h-5 w-5" /></div><div className="flex-1"><strong>{r.titel}</strong><p className="mt-1 text-sm text-[var(--nova-text-schwaecher)]">{r.text}</p></div><span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-500">Aktiv</span></div>)}</div></div></section>;
}

function StatKarte({ label, wert }: { label: string; wert: string | number }) { return <div className={`${kartenKlasse} p-5`}><p className="text-sm text-[var(--nova-text-schwaecher)]">{label}</p><p className="mt-2 text-2xl font-bold">{wert}</p></div>; }
function LeererBereich({ text, icon }: { text: string; icon?: React.ReactNode }) { return <div className="flex min-h-40 items-center justify-center p-8 text-center text-sm text-[var(--nova-text-schwaecher)]"><div>{icon && <div className="mb-3 flex justify-center">{icon}</div>}{text}</div></div>; }
