"use client";

import { ChevronDown, Menu, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import BenachrichtigungsGlocke from "./dashboard/BenachrichtigungsGlocke";

const titel: Array<[string, string]> = [
  ["/zentrale", "Zentrale"], ["/vertrieb", "Vertrieb"], ["/disposition", "Disposition"],
  ["/buchhaltung", "Buchhaltung"], ["/cad", "CAD-Büro"], ["/einkauf", "Einkauf"],
  ["/bestellungen", "Bestellungen"], ["/bestand", "Bestand"], ["/lager", "Lager"],
  ["/qualitaet", "Konfektion & Qualität"], ["/logistik", "Logistik"],
  ["/kommunikation", "NOVA Connect"], ["/organisation", "Organisation"],
  ["/mitarbeiter", "Mitarbeiter"], ["/nova-sheets", "NOVA Sheets"],
  ["/alarmcenter", "Alarmcenter"], ["/admin", "Administration"],
  ["/einstellungen", "Einstellungen"], ["/nova-ai", "NOVA AI"],
];

export default function NovaTopbar() {
  const pathname = usePathname();
  const { user, vollerName, logout } = useAuth();
  const [menueOffen, setMenueOffen] = useState(false);
  const menueRef = useRef<HTMLDivElement>(null);
  const seitentitel = titel.find(([pfad]) => pathname === pfad || pathname.startsWith(`${pfad}/`))?.[1] ?? "NOVA ERP";
  const initialen = user ? `${user.vorname?.[0] ?? ""}${user.nachname?.[0] ?? ""}` : "N";

  useEffect(() => {
    setMenueOffen(false);
  }, [pathname]);

  useEffect(() => {
    function ausserhalb(event: MouseEvent) {
      if (!menueRef.current?.contains(event.target as Node)) setMenueOffen(false);
    }
    document.addEventListener("mousedown", ausserhalb);
    return () => document.removeEventListener("mousedown", ausserhalb);
  }, []);

  return (
    <header className="fixed left-[236px] right-0 top-0 z-40 flex h-[76px] items-center border-b border-slate-200 bg-white/95 px-6 text-slate-900 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-[#0d1727]/95 dark:text-white">
      <div className="flex min-w-0 items-center gap-3">
        <Menu className="h-5 w-5 text-slate-500" />
        <div><h1 className="truncate text-lg font-bold">{seitentitel}</h1><p className="text-xs text-slate-500 dark:text-slate-400">NOVA ERP · Workflow Automation</p></div>
      </div>
      <button type="button" onClick={() => window.dispatchEvent(new Event("nova-suche-oeffnen"))} className="absolute left-1/2 flex w-[min(420px,34vw)] -translate-x-1/2 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500 shadow-sm transition hover:border-[var(--nova-akzent)] hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800">
        <Search className="h-4 w-4" /><span className="flex-1 text-left">NOVA durchsuchen …</span><kbd className="rounded border border-slate-300 px-1.5 py-0.5 text-[10px] dark:border-slate-600">Strg K</kbd>
      </button>
      <div className="ml-auto flex items-center gap-3">
        <BenachrichtigungsGlocke />
        <div className="h-7 w-px bg-slate-200 dark:bg-slate-700" />
        <div ref={menueRef} className="relative">
          <button type="button" onClick={() => setMenueOffen((wert) => !wert)} className="flex items-center gap-3 rounded-xl px-2 py-1.5 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800" aria-expanded={menueOffen}>
            <span className="nova-akzent-verlauf flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white">{initialen}</span>
            <span className="hidden leading-tight lg:block"><span className="block text-sm font-semibold">{vollerName || "NOVA Benutzer"}</span><span className="block text-[11px] text-slate-500 dark:text-slate-400">{user?.abteilung || user?.rolle || "NOVA ERP"}</span></span>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${menueOffen ? "rotate-180" : ""}`} />
          </button>
          {menueOffen && (
            <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white">
              <div className="border-b border-slate-200 px-3 py-2 dark:border-slate-700"><p className="font-semibold">{vollerName}</p><p className="text-xs text-slate-500 dark:text-slate-400">{user?.rolle}</p></div>
              <Link href="/einstellungen" className="mt-1 block rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">Einstellungen</Link>
              <button type="button" onClick={() => logout()} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800">Abmelden</button>
              <button type="button" onClick={() => logout("/beendet")} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">Feierabend / NOVA schließen</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
