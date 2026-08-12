"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type ComponentType, type MouseEvent } from "react";
import {
  Activity,
  AlarmClock,
  BarChart3,
  Boxes,
  Building2,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  FileSpreadsheet,
  Headphones,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  PackageSearch,
  Plug,
  Ruler,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import useModulRechte from "@/hooks/useModulRechte";

type Eintrag = { name: string; href: string };
type Gruppe = {
  id: string;
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  bereich: "unternehmen" | "prozesse" | "zusammenarbeit" | "administration";
  modul?: string;
  nurAdmin?: boolean;
  kinder?: Eintrag[];
};

const gruppen: Gruppe[] = [
  { id: "dashboard", name: "Dashboard", href: "/", icon: LayoutDashboard, bereich: "unternehmen", modul: "dashboard" },
  { id: "zentrale", name: "Zentrale", href: "/zentrale", icon: Headphones, bereich: "unternehmen", modul: "zentrale", kinder: [{ name: "Übersicht", href: "/zentrale" }, { name: "Telefonzentrale", href: "/zentrale/telefon" }, { name: "Abwesenheiten", href: "/zentrale/abwesenheiten" }, { name: "Stempeluhr", href: "/zentrale/stempeluhr" }] },
  { id: "vertrieb", name: "Vertrieb", href: "/vertrieb", icon: BarChart3, bereich: "unternehmen", modul: "vertrieb", kinder: [{ name: "Übersicht", href: "/vertrieb" }, { name: "Kunden", href: "/vertrieb/kunden" }, { name: "Angebote", href: "/vertrieb/angebote" }] },
  { id: "disposition", name: "Disposition", href: "/disposition", icon: CalendarDays, bereich: "unternehmen", modul: "disposition", kinder: [{ name: "Übersicht", href: "/disposition" }, { name: "Bedarfe", href: "/disposition/bedarfe" }, { name: "Beschaffungsvorschläge", href: "/disposition/vorschlaege" }, { name: "Terminüberwachung", href: "/disposition/termine" }] },
  { id: "buchhaltung", name: "Buchhaltung", href: "/buchhaltung", icon: FileSpreadsheet, bereich: "unternehmen", modul: "buchhaltung", kinder: [{ name: "Übersicht", href: "/buchhaltung" }, { name: "Rechnungen", href: "/buchhaltung/rechnungen" }, { name: "Zahlungseingänge", href: "/buchhaltung/zahlungen" }] },
  { id: "cad", name: "CAD-Büro", href: "/cad", icon: Ruler, bereich: "unternehmen", modul: "cad", kinder: [{ name: "Übersicht", href: "/cad" }, { name: "Dokumente", href: "/cad/dokumente" }, { name: "Freigaben", href: "/cad/freigaben" }] },
  { id: "einkauf", name: "Einkauf", href: "/einkauf", icon: ShoppingCart, bereich: "prozesse", modul: "bestellungen", kinder: [{ name: "Übersicht", href: "/einkauf" }, { name: "Bestellungen", href: "/bestellungen" }, { name: "Lieferanten", href: "/einkauf/lieferanten" }] },
  { id: "lager", name: "Lager", href: "/lager", icon: Warehouse, bereich: "prozesse", modul: "lager", kinder: [{ name: "Übersicht", href: "/lager" }, { name: "Bestand", href: "/bestand" }, { name: "Lagerplätze", href: "/lager/lagerplaetze" }, { name: "MDE-Erfassung", href: "/lager/mde" }, { name: "PC-Bestätigung", href: "/lager/produktzugang" }, { name: "Umlagerungen", href: "/lager/umlagerungen" }, { name: "Inventur", href: "/lager/inventur" }, { name: "Barcode / MDE", href: "/lager/ladungstraeger" }] },
  { id: "konfektion", name: "Konfektion", href: "/qualitaet", icon: ClipboardCheck, bereich: "prozesse", modul: "konfektion", kinder: [{ name: "Übersicht", href: "/qualitaet" }, { name: "Qualitätsprüfung", href: "/qualitaet/pruefungen" }, { name: "Prüfaufträge", href: "/qualitaet/pruefauftraege" }, { name: "Freigaben", href: "/qualitaet/freigaben" }, { name: "Sperrbestand", href: "/qualitaet/sperrbestand" }, { name: "Konfektionsaufträge", href: "/qualitaet/konfektion" }] },
  { id: "logistik", name: "Logistik", href: "/logistik", icon: Truck, bereich: "prozesse", modul: "logistik", kinder: [{ name: "Übersicht", href: "/logistik" }, { name: "Aufträge", href: "/logistik/auftraege" }, { name: "Kommissionierung", href: "/logistik/kommissionierung" }, { name: "Ladungen", href: "/logistik/ladungen" }, { name: "Versand", href: "/logistik/versand" }, { name: "DESADV", href: "/logistik/desadv" }, { name: "Lieferscheine", href: "/logistik/lieferscheine" }] },
  { id: "kommunikation", name: "Kommunikation", href: "/kommunikation", icon: Mail, bereich: "zusammenarbeit", kinder: [{ name: "NOVA Mail", href: "/kommunikation" }, { name: "Interner Chat", href: "/kommunikation/chat" }, { name: "Team-Kommunikation", href: "/kommunikation/team" }, { name: "Dateien", href: "/kommunikation/dateien" }, { name: "Audio & Video", href: "/kommunikation/besprechungen" }, { name: "NOVA AI", href: "/kommunikation/ai" }, { name: "Systemmeldungen", href: "/kommunikation/system" }, { name: "Automatischer Versand", href: "/kommunikation/automatisch" }] },
  { id: "organisation", name: "Organisation", href: "/organisation", icon: CalendarDays, bereich: "zusammenarbeit", kinder: [{ name: "Unternehmenskalender", href: "/organisation" }, { name: "Persönlicher Kalender", href: "/organisation/persoenlich" }, { name: "Terminplanung", href: "/organisation/termine" }, { name: "Besprechungen", href: "/organisation/besprechungen" }, { name: "Urlaubsplanung", href: "/organisation/urlaub" }, { name: "Ressourcenplanung", href: "/organisation/ressourcen" }] },
  { id: "mitarbeiter", name: "Mitarbeiter", href: "/mitarbeiter", icon: Users, bereich: "zusammenarbeit", kinder: [{ name: "Übersicht", href: "/mitarbeiter" }, { name: "Aufgabenverwaltung", href: "/mitarbeiter/aufgaben" }, { name: "Schichtplanung", href: "/mitarbeiter/schichten" }, { name: "Digitale Arbeitsaufträge", href: "/mitarbeiter/arbeitsauftraege" }, { name: "Interne Nachrichten", href: "/mitarbeiter/nachrichten" }, { name: "Aktivitätsprotokolle", href: "/mitarbeiter/aktivitaeten" }] },
  { id: "sheets", name: "NOVA Sheets", href: "/nova-sheets", icon: FileSpreadsheet, bereich: "administration" },
  { id: "mde-live", name: "Live MDE", href: "/lager/mde-live", icon: Activity, bereich: "administration" },
  { id: "alarmcenter", name: "Alarmcenter", href: "/alarmcenter", icon: AlarmClock, bereich: "administration" },
  { id: "admin", name: "Benutzerverwaltung", href: "/admin", icon: Users, bereich: "administration", nurAdmin: true, kinder: [{ name: "Team & Prozesse", href: "/admin/prozesse" }, { name: "Benutzer", href: "/admin/benutzer" }, { name: "Rollen", href: "/admin/rollen" }, { name: "Rechte", href: "/admin/rechte" }, { name: "Systemeinstellungen", href: "/admin/systemeinstellungen" }, { name: "Protokolle", href: "/admin/protokolle" }, { name: "Performance", href: "/admin/performance" }] },
  { id: "integrationen", name: "Integrationen", href: "/admin/integrationen", icon: Plug, bereich: "administration", nurAdmin: true },
  { id: "sicherheit", name: "Sicherheit", href: "/admin/sicherheit", icon: LockKeyhole, bereich: "administration", nurAdmin: true },
  { id: "audit-trail", name: "Audit Trail", href: "/admin/audit-trail", icon: ShieldCheck, bereich: "administration", nurAdmin: true },
];

const bereiche = [
  ["unternehmen", "Unternehmen"],
  ["prozesse", "Prozesse"],
  ["zusammenarbeit", "Zusammenarbeit"],
  ["administration", "Administration"],
] as const;

export default function NovaSidebar() {
  const pathname = usePathname();
  const { istAdmin } = useAuth();
  const { hatModulRecht } = useModulRechte();
  const [geoeffnet, setGeoeffnet] = useState<string | null>(null);
  const [flyoutOben, setFlyoutOben] = useState(84);
  const schliessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sichtbar = gruppen.filter((gruppe) => (!gruppe.nurAdmin || istAdmin) && (!gruppe.modul || hatModulRecht(gruppe.modul)));
  const offeneGruppe = sichtbar.find((gruppe) => gruppe.id === geoeffnet && gruppe.kinder);

  function schliessenAbbrechen() {
    if (schliessTimer.current) {
      clearTimeout(schliessTimer.current);
      schliessTimer.current = null;
    }
  }

  function gruppeOeffnen(event: MouseEvent<HTMLDivElement>, gruppe: Gruppe) {
    if (!gruppe.kinder) return;
    schliessenAbbrechen();
    const hoehe = Math.min(540, 28 + gruppe.kinder.length * 38);
    const oben = Math.max(84, Math.min(event.currentTarget.getBoundingClientRect().top, window.innerHeight - hoehe - 16));
    setFlyoutOben(oben);
    setGeoeffnet(gruppe.id);
  }

  function schliessenVormerken() {
    schliessenAbbrechen();
    schliessTimer.current = setTimeout(() => setGeoeffnet(null), 140);
  }

  function istAktiv(gruppe: Gruppe) {
    return gruppe.href === "/" ? pathname === "/" : pathname === gruppe.href || pathname.startsWith(`${gruppe.href}/`) || (gruppe.id === "einkauf" && pathname.startsWith("/bestellungen"));
  }

  function istKindAktiv(href: string, elternHref: string) {
    return pathname === href || (href !== elternHref && pathname.startsWith(`${href}/`));
  }

  return (
    <aside className="nova-enterprise-sidebar fixed inset-y-0 left-0 z-50 flex w-[236px] flex-col border-r border-slate-800 bg-[#101d2d] text-slate-300 shadow-xl">
      <Link href="/" className="flex h-[76px] shrink-0 items-center gap-3 border-b border-slate-800 px-5">
        <span className="nova-akzent-verlauf flex h-9 w-9 items-center justify-center rounded-xl font-bold text-white shadow-lg">N</span>
        <span><strong className="block text-sm text-white">NOVA ERP</strong><small className="block text-[10px] text-slate-400">Workflow Automation</small></span>
      </Link>

      <nav className="nova-sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-3">
        {bereiche.map(([bereich, titel]) => {
          const eintraege = sichtbar.filter((gruppe) => gruppe.bereich === bereich);
          if (!eintraege.length) return null;
          return (
            <div key={bereich} className="mb-4">
              <p className="px-3 pb-2 pt-2 text-[10px] font-bold uppercase tracking-[.2em] text-slate-500">{titel}</p>
              <div className="space-y-1">
                {eintraege.map((gruppe) => {
                  const Icon = gruppe.icon;
                  const aktiv = istAktiv(gruppe);
                  const offen = geoeffnet === gruppe.id;
                  return (
                    <div key={gruppe.id} onMouseEnter={(event) => gruppeOeffnen(event, gruppe)} onMouseLeave={schliessenVormerken}>
                      <Link href={gruppe.href} className={`flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${aktiv ? "nova-akzent-verlauf text-white shadow-md" : "hover:bg-white/7 hover:text-white"}`}>
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{gruppe.name}</span>
                        {gruppe.kinder && <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${offen ? "rotate-180" : ""}`} />}
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {offeneGruppe?.kinder && (
        <div
              className="fixed left-[236px] z-[70] w-64 animate-[nova-flyout_160ms_ease-out] rounded-xl border border-slate-700 bg-[#142338] p-2 shadow-2xl"
          style={{ top: flyoutOben }}
          onMouseEnter={schliessenAbbrechen}
          onMouseLeave={schliessenVormerken}
        >
          <div className="mb-1 px-3 py-2 text-xs font-bold uppercase tracking-[.16em] text-slate-500">
            {offeneGruppe.name}
          </div>
          {offeneGruppe.kinder.map((kind) => (
            <Link
              key={kind.href}
              href={kind.href}
              onClick={() => setGeoeffnet(null)}
              className={`block rounded-lg px-3 py-2.5 text-sm transition ${
                istKindAktiv(kind.href, offeneGruppe.href)
                  ? "nova-akzent-verlauf font-semibold text-white"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {kind.name}
            </Link>
          ))}
        </div>
      )}

      <Link href="/einstellungen" className="flex shrink-0 items-center gap-3 border-t border-slate-800 px-6 py-4 text-sm hover:bg-white/5 hover:text-white">
        <Settings className="h-4 w-4" /> Einstellungen
      </Link>
    </aside>
  );
}
