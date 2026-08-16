"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlarmClock,
  BarChart3,
  Bell,
  BookOpenCheck,
  Boxes,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  CircleDollarSign,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  Home,
  Mail,
  PackageCheck,
  PanelLeft,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
  WandSparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import BenachrichtigungsGlocke from "@/components/dashboard/BenachrichtigungsGlocke";

type DashboardDaten = {
  aktualisiertAm: string;
  systemstatus: "STABIL" | "AUFMERKSAMKEIT";
  kennzahlen: {
    artikelGesamt: number;
    kritischeBestaende: number;
    ohneBestand: number;
    offeneBestellungen: number;
    offeneAuftraege: number;
    offeneQs: number;
    sperrbestaende: number;
    offeneMde: number;
    offeneInventuren: number;
    versandbereit: number;
  };
  heute: {
    lagerHeute: number;
    pruefungenHeute: number;
    kommissioniertHeute: number;
    versendetHeute: number;
  };
  umsatz: {
    versendetHeute: number;
    bezahltHeute: number;
    sendungen: Array<{ id: number; versandnummer: string; auftragsnummer: string; kunde: string; warenwert: number; versendetAm: string | null; versendetVon: string | null; lieferscheinnummer: string | null }>;
    zahlungen: Array<{ id: number; rechnungsnummer: string; kunde: string; betreff: string; betrag: number; zahlungsart: string; referenz: string | null; gebuchtAm: string; gebuchtVon: string | null }>;
  } | null;
  warnungen: Array<{ stufe: string; titel: string; text: string; href: string }>;
  empfehlungen: string[];
};

type Navigation = {
  titel: string;
  punkte: Array<{ name: string; href: string; icon: LucideIcon }>;
};

type DemoSchritt = {
  nummer: number;
  titel: string;
  text: string;
  href: string;
  status: "ERLEDIGT" | "BEREIT" | "GESPERRT";
};

type DemoAblauf = {
  bestellnummer?: string;
  lieferscheinnummer?: string;
  schritte: DemoSchritt[];
};

const DEMO_ABLAUF_KEY = "nova-demo-ablauf";

const navigation: Navigation[] = [
  { titel: "", punkte: [{ name: "Dashboard", href: "/next", icon: Home }] },
  {
    titel: "Unternehmen",
    punkte: [
      { name: "Zentrale", href: "/zentrale", icon: Building2 },
      { name: "Vertrieb", href: "/vertrieb", icon: BarChart3 },
      { name: "Disposition", href: "/disposition", icon: CalendarDays },
      { name: "Buchhaltung", href: "/buchhaltung", icon: CircleDollarSign },
      { name: "CAD-Büro", href: "/cad", icon: BookOpenCheck },
    ],
  },
  {
    titel: "Prozesse",
    punkte: [
      { name: "Einkauf", href: "/einkauf", icon: ShoppingCart },
      { name: "Lager", href: "/lager", icon: Warehouse },
      { name: "Konfektion", href: "/qualitaet", icon: ClipboardCheck },
      { name: "Logistik", href: "/logistik", icon: Truck },
    ],
  },
  {
    titel: "Zusammenarbeit",
    punkte: [
      { name: "Kommunikation", href: "/kommunikation", icon: Mail },
      { name: "Organisation", href: "/organisation", icon: CalendarDays },
      { name: "Mitarbeiter", href: "/mitarbeiter", icon: Users },
      { name: "NOVA Sheets", href: "/nova-sheets", icon: FileSpreadsheet },
    ],
  },
  {
    titel: "Administration",
    punkte: [
      { name: "Live MDE", href: "/admin/mde-live", icon: Activity },
      { name: "Alarmcenter", href: "/alarmcenter", icon: AlarmClock },
      { name: "Sicherheit", href: "/admin/sicherheit", icon: ShieldCheck },
      { name: "Einstellungen", href: "/einstellungen", icon: Settings },
    ],
  },
];

const untermenues: Record<string, Array<{ name: string; href: string }>> = {
  Zentrale: [
    { name: "Übersicht", href: "/zentrale" },
    { name: "Telefonzentrale", href: "/zentrale/telefon" },
    { name: "Abwesenheiten", href: "/zentrale/abwesenheiten" },
    { name: "Stempeluhr", href: "/zentrale/stempeluhr" },
  ],
  Vertrieb: [
    { name: "Übersicht", href: "/vertrieb" },
    { name: "Kunden", href: "/vertrieb/kunden" },
    { name: "Angebote", href: "/vertrieb/angebote" },
  ],
  Disposition: [
    { name: "Übersicht", href: "/disposition" },
    { name: "Bedarfe", href: "/disposition/bedarfe" },
    { name: "Beschaffungsvorschläge", href: "/disposition/vorschlaege" },
    { name: "Terminüberwachung", href: "/disposition/termine" },
  ],
  Buchhaltung: [
    { name: "Übersicht", href: "/buchhaltung" },
    { name: "Rechnungen", href: "/buchhaltung/rechnungen" },
    { name: "Zahlungseingänge", href: "/buchhaltung/zahlungen" },
  ],
  "CAD-Büro": [
    { name: "Übersicht", href: "/cad" },
    { name: "Dokumente", href: "/cad/dokumente" },
    { name: "Freigaben", href: "/cad/freigaben" },
  ],
  Einkauf: [
    { name: "Übersicht", href: "/einkauf" },
    { name: "Bestellungen", href: "/bestellungen" },
    { name: "Lieferanten", href: "/einkauf/lieferanten" },
  ],
  Lager: [
    { name: "Übersicht", href: "/lager" },
    { name: "Bestand", href: "/bestand" },
    { name: "Lagerplätze", href: "/lager/lagerplaetze" },
    { name: "MDE-Erfassung", href: "/lager/mde" },
    { name: "PC-Bestätigung", href: "/lager/produktzugang" },
    { name: "Umlagerungen", href: "/lager/umlagerungen" },
    { name: "Inventur", href: "/lager/inventur" },
    { name: "Barcode / MDE", href: "/lager/ladungstraeger" },
  ],
  Konfektion: [
    { name: "Übersicht", href: "/qualitaet" },
    { name: "Qualitätsprüfung", href: "/qualitaet/pruefungen" },
    { name: "Prüfaufträge", href: "/qualitaet/pruefauftraege" },
    { name: "Freigaben", href: "/qualitaet/freigaben" },
    { name: "Sperrbestand", href: "/qualitaet/sperrbestand" },
    { name: "Konfektionsaufträge", href: "/qualitaet/konfektion" },
  ],
  Logistik: [
    { name: "Übersicht", href: "/logistik" },
    { name: "Aufträge", href: "/logistik/auftraege" },
    { name: "Kommissionierung", href: "/logistik/kommissionierung" },
    { name: "Ladungen", href: "/logistik/ladungen" },
    { name: "Versand", href: "/logistik/versand" },
    { name: "DESADV", href: "/logistik/desadv" },
    { name: "Lieferscheine", href: "/logistik/lieferscheine" },
  ],
  Kommunikation: [
    { name: "NOVA Mail", href: "/kommunikation" },
    { name: "Interner Chat", href: "/kommunikation/chat" },
    { name: "Team-Kommunikation", href: "/kommunikation/team" },
    { name: "Systemmeldungen", href: "/kommunikation/system" },
    { name: "Automatischer Versand", href: "/kommunikation/automatisch" },
  ],
  Organisation: [
    { name: "Unternehmenskalender", href: "/organisation" },
    { name: "Persönlicher Kalender", href: "/organisation/persoenlich" },
    { name: "Terminplanung", href: "/organisation/termine" },
    { name: "Besprechungen", href: "/organisation/besprechungen" },
    { name: "Urlaubsplanung", href: "/organisation/urlaub" },
    { name: "Ressourcenplanung", href: "/organisation/ressourcen" },
  ],
  Mitarbeiter: [
    { name: "Übersicht", href: "/mitarbeiter" },
    { name: "Aufgabenverwaltung", href: "/mitarbeiter/aufgaben" },
    { name: "Schichtplanung", href: "/mitarbeiter/schichten" },
    { name: "Digitale Arbeitsaufträge", href: "/mitarbeiter/arbeitsauftraege" },
    { name: "Interne Nachrichten", href: "/mitarbeiter/nachrichten" },
    { name: "Aktivitätsprotokolle", href: "/mitarbeiter/aktivitaeten" },
  ],
};

export default function NovaNextPage() {
  const pathname = usePathname();
  const eigenstaendigesLayout = pathname === "/next";
  const { user, vollerName, logout } = useAuth();
  const [daten, setDaten] = useState<DashboardDaten | null>(null);
  const [fehler, setFehler] = useState("");
  const [laedt, setLaedt] = useState(false);
  const [sidebarOffen, setSidebarOffen] = useState(true);
  const [suche, setSuche] = useState("");
  const [benutzerMenueOffen, setBenutzerMenueOffen] = useState(false);
  const [demoLaedt, setDemoLaedt] = useState(false);
  const [demoMeldung, setDemoMeldung] = useState("");
  const [demoAblauf, setDemoAblauf] = useState<DemoAblauf | null>(null);
  const [demoDetailsOffen, setDemoDetailsOffen] = useState(false);
  const [umsatzDetails, setUmsatzDetails] = useState<"versendet" | "bezahlt" | null>(null);
  const [offenesUntermenue, setOffenesUntermenue] = useState<{
    name: string;
    oben: number;
  } | null>(null);
  const untermenueTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function untermenueSchliessenAbbrechen() {
    if (untermenueTimer.current) {
      clearTimeout(untermenueTimer.current);
      untermenueTimer.current = null;
    }
  }

  function untermenueVerzoegertSchliessen() {
    untermenueSchliessenAbbrechen();
    untermenueTimer.current = setTimeout(() => {
      setOffenesUntermenue(null);
      untermenueTimer.current = null;
    }, 250);
  }

  const laden = useCallback(async () => {
    setLaedt(true);
    try {
      const antwort = await fetch(`/api/dashboard/command-center?zeit=${Date.now()}`, {
        cache: "no-store",
      });
      const ergebnis = await antwort.json();
      if (!antwort.ok) throw new Error(ergebnis.fehler ?? "Dashboard konnte nicht geladen werden.");
      setDaten(ergebnis);
      setFehler("");
    } catch (error) {
      setFehler(error instanceof Error ? error.message : "Dashboard konnte nicht geladen werden.");
    } finally {
      setLaedt(false);
    }
  }, []);

  useEffect(() => {
    void laden();
  }, [laden]);

  useEffect(() => {
    try {
      const gespeichert = window.sessionStorage.getItem(DEMO_ABLAUF_KEY);
      if (gespeichert) setDemoAblauf(JSON.parse(gespeichert) as DemoAblauf);
    } catch {
      window.sessionStorage.removeItem(DEMO_ABLAUF_KEY);
    }
  }, []);

  const suchErgebnisse = useMemo(() => {
    const wert = suche.trim().toLocaleLowerCase("de-DE");
    if (!wert) return [];
    return navigation
      .flatMap((gruppe) => gruppe.punkte)
      .filter((punkt) => punkt.name.toLocaleLowerCase("de-DE").includes(wert));
  }, [suche]);

  const initials = user
    ? `${user.vorname.charAt(0)}${user.nachname.charAt(0)}`.toUpperCase()
    : "N";

  const istDemo =
    user?.personalnummer === "10000" &&
    user.vorname.toLocaleLowerCase("de-DE") === "nova" &&
    user.nachname.toLocaleLowerCase("de-DE") === "demo";
  const demoAbgeschlossen = demoAblauf?.schritte.length
    ? demoAblauf.schritte.every((schritt) => schritt.status === "ERLEDIGT")
    : false;

  useEffect(() => {
    if (demoAbgeschlossen) setDemoDetailsOffen(false);
  }, [demoAbgeschlossen]);

  useEffect(() => {
    if (!istDemo) return;
    let aktiv = true;
    const fortschrittLaden = async () => {
      try {
        const antwort = await fetch(`/api/demo/testlauf?zeit=${Date.now()}`, { cache: "no-store" });
        const ergebnis = await antwort.json() as DemoAblauf & { aktiv?: boolean };
        if (aktiv && antwort.ok && ergebnis.schritte) {
          setDemoAblauf(ergebnis);
          window.sessionStorage.setItem(DEMO_ABLAUF_KEY, JSON.stringify(ergebnis));
        }
      } catch { /* Der normale Dashboardbetrieb bleibt verfügbar. */ }
    };
    void fortschrittLaden();
    const timer = window.setInterval(() => void fortschrittLaden(), 4_000);
    return () => { aktiv = false; window.clearInterval(timer); };
  }, [istDemo]);

  async function demoVorbereiten() {
    setDemoLaedt(true);
    setDemoMeldung("");
    try {
      const antwort = await fetch("/api/demo/testlauf", { method: "POST" });
      const ergebnis = (await antwort.json()) as { meldung?: string; fehler?: string; bestellnummer?: string; lieferscheinnummer?: string; schritte?: DemoSchritt[] };
      setDemoMeldung(ergebnis.meldung ?? ergebnis.fehler ?? "Unbekannte Antwort.");
      if (antwort.ok && ergebnis.schritte) {
        const ablauf: DemoAblauf = { bestellnummer: ergebnis.bestellnummer, lieferscheinnummer: ergebnis.lieferscheinnummer, schritte: ergebnis.schritte };
        setDemoAblauf(ablauf);
        setDemoDetailsOffen(false);
        window.sessionStorage.setItem(DEMO_ABLAUF_KEY, JSON.stringify(ablauf));
        await laden();
      }
    } catch {
      setDemoMeldung("Der Demo-Testlauf konnte nicht gestartet werden.");
    } finally {
      setDemoLaedt(false);
    }
  }

  return (
    <div className="nova-next-dashboard min-h-screen bg-[#f4f7fb] text-slate-800">
      {eigenstaendigesLayout && <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden bg-[#101c2d] text-slate-200 shadow-xl transition-all duration-300 ${sidebarOffen ? "w-[236px]" : "w-[72px]"}`}>
        <div className="flex h-[72px] items-center gap-3 border-b border-white/10 px-5">
          <div className="nova-akzent-verlauf flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-black text-white shadow-lg shadow-indigo-950/40">N</div>
          {sidebarOffen && <div><p className="font-bold tracking-wide text-white">NOVA ERP</p><p className="text-[10px] text-slate-400">Workflow Automation</p></div>}
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          {navigation.map((gruppe, index) => (
            <div key={gruppe.titel || index} className="mb-4">
              {sidebarOffen && gruppe.titel && <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">{gruppe.titel}</p>}
              <div className="space-y-1">
                {gruppe.punkte.map(({ name, href, icon: Icon }) => {
                  const kinder = untermenues[name];

                  return (
                    <div
                      key={name}
                      className="relative"
                      onMouseEnter={(event) => {
                        if (!kinder?.length) return;
                        untermenueSchliessenAbbrechen();
                        const rect = event.currentTarget.getBoundingClientRect();
                        const flyoutHoehe = Math.min(440, 58 + kinder.length * 41);
                        const oben = Math.max(
                          12,
                          Math.min(rect.top, window.innerHeight - flyoutHoehe - 12)
                        );
                        setOffenesUntermenue({ name, oben });
                      }}
                      onMouseLeave={untermenueVerzoegertSchliessen}
                    >
                      <Link
                        href={href}
                        title={name}
                        className={`flex items-center rounded-lg py-2.5 text-[13px] transition ${
                          sidebarOffen ? "gap-3 px-3" : "justify-center"
                        } ${
                          name === "Dashboard"
                            ? "nova-akzent-verlauf text-white shadow-md shadow-indigo-950/30"
                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {sidebarOffen && <span className="min-w-0 flex-1">{name}</span>}
                        {sidebarOffen && kinder?.length ? (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                        ) : null}
                      </Link>

                      {kinder?.length && offenesUntermenue?.name === name ? (
                        <div
                          onMouseEnter={untermenueSchliessenAbbrechen}
                          onMouseLeave={untermenueVerzoegertSchliessen}
                          className="fixed z-[70] w-64 overflow-hidden rounded-xl border border-white/10 bg-[#152338] p-2 text-slate-200 shadow-2xl shadow-black/40"
                          style={{
                            left: sidebarOffen ? 228 : 64,
                            top: offenesUntermenue.oben,
                          }}
                        >
                          <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">
                            {name}
                          </p>
                          <div className="max-h-[370px] space-y-1 overflow-y-auto">
                            {kinder.map((kind) => (
                              <Link
                                key={`${name}-${kind.href}`}
                                href={kind.href}
                                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] text-slate-300 transition hover:bg-white/10 hover:text-white"
                              >
                                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                                <span>{kind.name}</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <button type="button" onClick={() => setSidebarOffen((offen) => !offen)} className="flex h-14 items-center gap-3 border-t border-white/10 px-6 text-xs text-slate-400 transition hover:bg-white/5 hover:text-white">
          <ChevronsLeft className={`h-4 w-4 transition ${sidebarOffen ? "" : "rotate-180"}`} />
          {sidebarOffen && "Menü einklappen"}
        </button>
      </aside>}

      <div className={eigenstaendigesLayout ? `transition-[padding] duration-300 ${sidebarOffen ? "pl-[236px]" : "pl-[72px]"}` : ""}>
        {eigenstaendigesLayout && <header className="sticky top-0 z-30 flex h-[72px] items-center border-b border-slate-200 bg-white/95 px-5 shadow-sm backdrop-blur">
          <button type="button" onClick={() => setSidebarOffen((offen) => !offen)} className="mr-4 rounded-lg p-2 text-slate-500 hover:bg-slate-100"><PanelLeft className="h-5 w-5" /></button>
          <div><h1 className="text-xl font-bold text-slate-900">Dashboard</h1><p className="text-[11px] text-slate-500">NOVA ERP im Überblick</p></div>

          <div className="relative mx-auto w-full max-w-[430px]">
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-sm focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
              <Search className="mr-2 h-4 w-4 text-slate-400" />
              <input value={suche} onChange={(event) => setSuche(event.target.value)} placeholder="NOVA durchsuchen ..." className="min-w-0 flex-1 bg-transparent outline-none" />
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-500">Strg + K</kbd>
            </div>
            {suchErgebnisse.length > 0 && <div className="absolute inset-x-0 top-12 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xl">{suchErgebnisse.map(({ name, href, icon: Icon }) => <Link key={name} href={href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-700"><Icon className="h-4 w-4" />{name}</Link>)}</div>}
          </div>

          <div className="flex items-center gap-2">
            <BenachrichtigungsGlocke />
            <div className="ml-2 h-8 w-px bg-slate-200" />
            <div className="relative ml-2">
              <button type="button" onClick={() => setBenutzerMenueOffen((offen) => !offen)} className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-white">{initials}</div><div className="hidden xl:block text-left"><p className="text-xs font-semibold text-slate-800">{vollerName || "NOVA Benutzer"}</p><p className="text-[10px] text-slate-500">{user?.abteilung ?? "NOVA ERP"}</p></div><ChevronDown className={`h-4 w-4 text-slate-500 transition ${benutzerMenueOffen ? "rotate-180" : ""}`} /></button>
              {benutzerMenueOffen && <div className="absolute right-0 top-12 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xl"><div className="border-b border-slate-100 px-3 py-2"><p className="text-sm font-semibold">{vollerName}</p><p className="text-xs text-slate-500">{user?.rolle}</p></div><Link href="/einstellungen" className="mt-1 block rounded-lg px-3 py-2 text-sm hover:bg-slate-100">Einstellungen</Link><button type="button" onClick={() => void logout()} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100">Abmelden</button><button type="button" onClick={() => void logout("/beendet")} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">Feierabend / NOVA schließen</button></div>}
            </div>
          </div>
        </header>}

        <main className="mx-auto max-w-[1700px] p-5 xl:p-7">
          {(istDemo || demoMeldung) && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4"><div><p className="text-sm font-semibold text-indigo-900">NOVA Demo-Modus</p><p className="text-xs text-indigo-700">{demoMeldung || "Bereite mit einem Klick einen vollständigen Testlauf vor."}</p></div>{istDemo && <button type="button" onClick={() => void demoVorbereiten()} disabled={demoLaedt} className="nova-akzent-verlauf rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{demoLaedt ? "Demo wird vorbereitet ..." : "Demo-Testlauf starten"}</button>}</div>}
          {demoAblauf && demoAbgeschlossen && !demoDetailsOffen && <section className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-300 bg-emerald-50 p-5 shadow-sm"><div className="flex items-center gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-white"><CheckCircle2 className="h-6 w-6" /></span><div><h2 className="font-bold text-emerald-950">Demo-Testlauf erfolgreich abgeschlossen</h2><p className="mt-1 text-sm text-emerald-700">Alle 8 Prozessschritte wurden vollständig und in der richtigen Reihenfolge erledigt.</p></div></div><button type="button" onClick={() => setDemoDetailsOffen(true)} className="rounded-lg border border-emerald-400 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100">Details anzeigen</button></section>}
          {demoAblauf && (!demoAbgeschlossen || demoDetailsOffen) && <section className="mb-5 overflow-hidden rounded-xl border border-indigo-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 bg-indigo-50 px-5 py-4">
              <div><h2 className="font-bold text-indigo-950">Geführter NOVA-Demoablauf</h2><p className="mt-1 text-xs text-indigo-700">Arbeite die Stationen der Reihe nach ab. Der erste Schritt ist vorbereitet.</p></div>
              <div className="flex items-center gap-4"><div className="text-right text-xs text-indigo-800"><p><b>Bestellung:</b> {demoAblauf.bestellnummer ?? "–"}</p><p><b>Lieferschein:</b> {demoAblauf.lieferscheinnummer ?? "–"}</p></div>{demoAbgeschlossen && <button type="button" onClick={() => setDemoDetailsOffen(false)} className="rounded-lg border border-indigo-300 bg-white px-3 py-2 text-xs font-semibold text-indigo-800">Einklappen</button>}</div>
            </div>
            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
              {demoAblauf.schritte.map((schritt) => {
                const inhalt = <><div className="flex items-center justify-between"><span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${schritt.status === "ERLEDIGT" ? "bg-emerald-500" : schritt.status === "BEREIT" ? "bg-indigo-600" : "bg-slate-400"}`}>{schritt.nummer}</span>{schritt.status === "ERLEDIGT" ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : schritt.status === "BEREIT" ? <ChevronRight className="h-5 w-5 text-indigo-500 transition group-hover:translate-x-1" /> : <span className="text-xs font-semibold text-slate-400">Gesperrt</span>}</div><h3 className="mt-3 text-sm font-bold text-slate-900">{schritt.titel}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{schritt.text}</p><p className={`mt-2 text-[10px] font-bold uppercase tracking-wide ${schritt.status === "ERLEDIGT" ? "text-emerald-600" : schritt.status === "BEREIT" ? "text-indigo-600" : "text-slate-400"}`}>{schritt.status === "ERLEDIGT" ? "Erledigt" : schritt.status === "BEREIT" ? "Jetzt bearbeiten" : "Vorherigen Schritt abschließen"}</p></>;
                return schritt.status === "GESPERRT"
                  ? <div key={schritt.nummer} className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 p-4 opacity-70">{inhalt}</div>
                  : <Link key={schritt.nummer} href={schritt.href} className="group rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-indigo-400 hover:bg-indigo-50">{inhalt}</Link>;
              })}
            </div>
          </section>}
          <section className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4"><div className={`h-3 w-3 rounded-full ${daten?.systemstatus === "AUFMERKSAMKEIT" ? "bg-amber-400" : "bg-emerald-500"}`} /><div><h2 className="text-lg font-bold text-slate-900">NOVA AI Command Center</h2><p className="text-xs text-slate-500">{daten?.systemstatus === "AUFMERKSAMKEIT" ? "Einige Prozesse benötigen Aufmerksamkeit" : "Alle Kernprozesse laufen stabil"}</p></div></div>
            <button type="button" onClick={() => void laden()} disabled={laedt} className="nova-akzent-verlauf flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${laedt ? "animate-spin" : ""}`} />{laedt ? "Aktualisiert ..." : "Live aktualisieren"}</button>
          </section>

          {fehler && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{fehler}</div>}

          <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kennzahl icon={Boxes} titel="Aktive Artikel" wert={daten?.kennzahlen.artikelGesamt} farbe="indigo" />
            <Kennzahl icon={BookOpenCheck} titel="Offene Aufträge" wert={daten?.kennzahlen.offeneAuftraege} farbe="blue" />
            <Kennzahl icon={ShoppingCart} titel="Offene Bestellungen" wert={daten?.kennzahlen.offeneBestellungen} farbe="amber" />
            <Kennzahl icon={PackageCheck} titel="Versandbereit" wert={daten?.kennzahlen.versandbereit} farbe="emerald" />
          </section>

          {daten?.umsatz && <section className="mb-5 grid gap-4 lg:grid-cols-2">
            <UmsatzKarte titel="Heute versendet" wert={daten.umsatz.versendetHeute} farbe="emerald" anzahl={daten.umsatz.sendungen.length} einheit="Sendungen" onClick={() => setUmsatzDetails("versendet")} />
            <UmsatzKarte titel="Heute bezahlt" wert={daten.umsatz.bezahltHeute} farbe="cyan" anzahl={daten.umsatz.zahlungen.length} einheit="Zahlungen" onClick={() => setUmsatzDetails("bezahlt")} />
          </section>}

          {umsatzDetails && daten?.umsatz && <UmsatzDetails typ={umsatzDetails} umsatz={daten.umsatz} schliessen={() => setUmsatzDetails(null)} />}

          <section className="mb-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="font-bold text-slate-900">Offene Aufgaben</h2><p className="text-xs text-slate-500">Aktueller Arbeitsvorrat aus NOVA ERP</p></div><ClipboardCheck className="h-5 w-5 text-indigo-500" /></div>
              <div className="divide-y divide-slate-100">
                <Aufgabe titel="MDE-Erfassungen bestätigen" wert={daten?.kennzahlen.offeneMde} href="/lager/produktzugang" />
                <Aufgabe titel="Qualitätsprüfungen bearbeiten" wert={daten?.kennzahlen.offeneQs} href="/qualitaet/pruefauftraege" />
                <Aufgabe titel="Inventurdifferenzen prüfen" wert={daten?.kennzahlen.offeneInventuren} href="/lager/inventur" />
                <Aufgabe titel="Kritische Bestände bearbeiten" wert={daten?.kennzahlen.kritischeBestaende} href="/bestand?filter=kritisch" />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-3"><div className="rounded-lg bg-violet-50 p-2 text-violet-600"><WandSparkles className="h-5 w-5" /></div><div><h2 className="font-bold text-slate-900">NOVA Empfehlungen</h2><p className="text-xs text-slate-500">Aus den aktuellen ERP-Daten</p></div></div><div className="space-y-3">{(daten?.empfehlungen ?? ["Daten werden geladen ..."]).map((text, index) => <div key={text} className="flex gap-3 rounded-lg border border-violet-100 bg-violet-50/60 p-3 text-sm"><span className="font-bold text-violet-600">{index + 1}.</span><span>{text}</span></div>)}</div></div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Tagesaktivität</h2><p className="text-xs text-slate-500">Heute gebuchte Prozessschritte</p></div><Activity className="h-5 w-5 text-indigo-500" /></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><MiniKpi titel="Lagerbewegungen" wert={daten?.heute.lagerHeute} /><MiniKpi titel="QS-Prüfungen" wert={daten?.heute.pruefungenHeute} /><MiniKpi titel="Kommissioniert" wert={daten?.heute.kommissioniertHeute} /><MiniKpi titel="Versendet" wert={daten?.heute.versendetHeute} /></div></div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Warnungen</h2><p className="text-xs text-slate-500">Vorgänge mit Handlungsbedarf</p></div><Bell className="h-5 w-5 text-amber-500" /></div>{(daten?.warnungen.length ?? 0) === 0 ? <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">Keine kritischen Warnungen vorhanden.</div> : <div className="space-y-2">{daten?.warnungen.map((warnung) => <Link key={warnung.titel} href={warnung.href} className="block rounded-lg border border-amber-200 bg-amber-50 p-3 hover:border-amber-400"><p className="text-sm font-semibold text-amber-900">{warnung.titel}</p><p className="mt-1 text-xs text-amber-700">{warnung.text}</p></Link>)}</div>}</div>
          </section>

          <p className="mt-5 text-right text-[11px] text-slate-400">{daten ? `Stand ${new Date(daten.aktualisiertAm).toLocaleString("de-DE")}` : "NOVA-Daten werden geladen ..."}</p>
        </main>
      </div>
    </div>
  );
}

function Kennzahl({ icon: Icon, titel, wert, farbe }: { icon: LucideIcon; titel: string; wert?: number; farbe: "indigo" | "blue" | "amber" | "emerald" }) {
  const farben = { indigo: "bg-indigo-50 text-indigo-600", blue: "bg-blue-50 text-blue-600", amber: "bg-amber-50 text-amber-600", emerald: "bg-emerald-50 text-emerald-600" };
  return <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className={`mb-4 inline-flex rounded-lg p-2.5 ${farben[farbe]}`}><Icon className="h-5 w-5" /></div><p className="text-xs font-medium text-slate-500">{titel}</p><p className="mt-1 text-3xl font-bold text-slate-900">{wert === undefined ? "–" : wert.toLocaleString("de-DE")}</p></div>;
}

function UmsatzKarte({ titel, wert, farbe, anzahl, einheit, onClick }: { titel: string; wert: number; farbe: "emerald" | "cyan"; anzahl: number; einheit: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`group cursor-pointer rounded-xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${farbe === "emerald" ? "border-emerald-200 hover:border-emerald-500" : "border-cyan-200 hover:border-cyan-500"}`}><div className="flex items-center justify-between"><div><p className="text-xs font-medium text-slate-500">{titel}</p><p className={`mt-2 text-3xl font-bold ${farbe === "emerald" ? "text-emerald-600" : "text-cyan-600"}`}>{wert.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</p><p className="mt-2 text-xs text-slate-500">{anzahl} {einheit} · Details anzeigen</p></div><div className={`rounded-xl p-3 transition group-hover:scale-110 ${farbe === "emerald" ? "bg-emerald-50 text-emerald-600" : "bg-cyan-50 text-cyan-600"}`}><CircleDollarSign className="h-6 w-6" /></div></div></button>;
}

function UmsatzDetails({ typ, umsatz, schliessen }: { typ: "versendet" | "bezahlt"; umsatz: NonNullable<DashboardDaten["umsatz"]>; schliessen: () => void }) {
  const versendet = typ === "versendet";
  const eintraege = versendet ? umsatz.sendungen : umsatz.zahlungen;
  return <div onMouseDown={(e) => e.target === e.currentTarget && schliessen()} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"><section className="max-h-[85vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] shadow-2xl"><header className="flex items-center justify-between border-b border-[var(--nova-rand)] p-6"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--nova-akzent)]">Tagesdetails</p><h2 className="mt-1 text-2xl font-bold">{versendet ? "Heute versendet" : "Heute bezahlt"}</h2><p className={`mt-1 text-xl font-bold ${versendet ? "text-emerald-500" : "text-cyan-500"}`}>{(versendet ? umsatz.versendetHeute : umsatz.bezahltHeute).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</p></div><button type="button" onClick={schliessen} className="rounded-xl border border-[var(--nova-rand)] p-3"><X className="h-5 w-5" /></button></header><div className="max-h-[65vh] space-y-3 overflow-auto p-6">{eintraege.length === 0 && <p className="rounded-xl border border-dashed border-[var(--nova-rand)] p-10 text-center text-[var(--nova-text-schwaecher)]">Heute sind noch keine Vorgänge vorhanden.</p>}{versendet ? umsatz.sendungen.map((s) => <article key={s.id} className="grid gap-3 rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] p-5 md:grid-cols-[1.4fr_1fr_auto]"><div><b>{s.versandnummer} · {s.auftragsnummer}</b><p className="mt-1 text-sm text-[var(--nova-text-schwaecher)]">{s.kunde}</p><p className="mt-1 text-xs">Lieferschein: {s.lieferscheinnummer ?? "nicht vorhanden"}</p></div><div className="text-sm"><p>{s.versendetAm ? new Date(s.versendetAm).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "–"} Uhr</p><p className="text-[var(--nova-text-schwaecher)]">durch {s.versendetVon ?? "System"}</p></div><b className="text-xl text-emerald-500">{s.warenwert.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</b></article>) : umsatz.zahlungen.map((z) => <article key={z.id} className="grid gap-3 rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] p-5 md:grid-cols-[1.4fr_1fr_auto]"><div><b>{z.rechnungsnummer} · {z.kunde}</b><p className="mt-1 text-sm text-[var(--nova-text-schwaecher)]">{z.betreff}</p><p className="mt-1 text-xs">Referenz: {z.referenz ?? "–"}</p></div><div className="text-sm"><p>{new Date(z.gebuchtAm).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr · {z.zahlungsart}</p><p className="text-[var(--nova-text-schwaecher)]">gebucht von {z.gebuchtVon ?? "System"}</p></div><b className="text-xl text-cyan-500">{z.betrag.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</b></article>)}</div></section></div>;
}

function Aufgabe({ titel, wert, href }: { titel: string; wert?: number; href: string }) {
  return <Link href={href} className="flex items-center justify-between px-5 py-4 transition hover:bg-indigo-50"><div><p className="text-sm font-semibold text-slate-700">{titel}</p><p className="mt-1 text-xs text-slate-400">Direkt im zuständigen NOVA-Modul öffnen</p></div><span className="min-w-9 rounded-full bg-indigo-50 px-3 py-1 text-center text-xs font-bold text-indigo-600">{wert ?? "–"}</span></Link>;
}

function MiniKpi({ titel, wert }: { titel: string; wert?: number }) {
  return <div className="rounded-lg border border-slate-100 bg-slate-50 p-4"><p className="text-[11px] text-slate-500">{titel}</p><p className="mt-2 text-2xl font-bold text-slate-900">{wert ?? "–"}</p></div>;
}
