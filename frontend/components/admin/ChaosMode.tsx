"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, PackageX, ServerOff, Siren, Truck, Undo2 } from "lucide-react";

type Szenario = { id: string; titel: string; details: string; stufe: string; aktiv: boolean };
const icons = { lieferant: PackageX, server: ServerOff, artikel: AlertTriangle, lkw: Truck } as const;

export default function ChaosMode() {
  const [szenarien, setSzenarien] = useState<Szenario[]>([]);
  const [laedt, setLaedt] = useState("");
  const [meldung, setMeldung] = useState("");

  const laden = useCallback(async () => {
    const response = await fetch("/api/administration/chaos-mode", { cache: "no-store" });
    const daten = await response.json();
    if (response.ok) setSzenarien(daten.szenarien);
    else setMeldung(daten.fehler ?? "Chaos Mode konnte nicht geladen werden.");
  }, []);

  useEffect(() => { void laden(); }, [laden]);

  async function ausfuehren(aktion: "simulieren" | "zuruecksetzen", szenario?: string) {
    setLaedt(szenario ?? aktion); setMeldung("");
    const response = await fetch("/api/administration/chaos-mode", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aktion, szenario }) });
    const daten = await response.json();
    setLaedt("");
    if (!response.ok) return setMeldung(daten.fehler ?? "Simulation fehlgeschlagen.");
    setSzenarien(daten.szenarien);
    setMeldung(aktion === "zuruecksetzen" ? "Alle Chaos-Simulationen wurden entfernt." : "Szenario wurde aktiviert. Prüfe jetzt Dashboard, Alarmcenter und den betroffenen Prozess.");
  }

  return <main className="mx-auto max-w-7xl p-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-semibold text-amber-500">ADMINISTRATION · TESTWERKZEUG</p><h1 className="mt-1 flex items-center gap-3 text-4xl font-bold"><Siren className="text-red-500" /> Chaos Mode</h1><p className="mt-3 max-w-3xl text-[var(--nova-text-schwaecher)]">Simuliere kontrollierte Störungen und prüfe, ob Warnungen, Zuständigkeiten und Folgeprozesse richtig reagieren. Es werden keine echten Server oder externen Systeme abgeschaltet.</p></div><button type="button" onClick={() => void ausfuehren("zuruecksetzen")} disabled={Boolean(laedt)} className="flex items-center gap-2 rounded-xl border border-[var(--nova-rand)] px-5 py-3 font-semibold transition hover:border-red-400 hover:text-red-400 disabled:opacity-50"><Undo2 className="h-4 w-4" /> Alle Simulationen zurücksetzen</button></div>
    <div className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-200"><b>Wichtig:</b> Chaos Mode ist ausschließlich für Administratoren sichtbar. Aktive Szenarien erscheinen im Alarmcenter und im Audit-Protokoll.</div>
    {meldung && <div className="mt-5 rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-4">{meldung}</div>}
    <section className="mt-8 grid gap-5 md:grid-cols-2">{szenarien.map((szenario) => { const Icon = icons[szenario.id as keyof typeof icons] ?? AlertTriangle; return <article key={szenario.id} className={`rounded-2xl border p-6 ${szenario.aktiv ? "border-red-500/50 bg-red-500/10" : "border-[var(--nova-rand)] bg-[var(--nova-flaeche)]"}`}><div className="flex items-start justify-between gap-4"><span className={`rounded-xl p-3 ${szenario.aktiv ? "bg-red-500/20 text-red-400" : "bg-[var(--nova-akzent-transparent)] text-[var(--nova-akzent)]"}`}><Icon className="h-6 w-6" /></span><span className={`rounded-full px-3 py-1 text-xs font-bold ${szenario.aktiv ? "bg-red-500/20 text-red-300" : "bg-slate-500/15 text-[var(--nova-text-schwaecher)]"}`}>{szenario.aktiv ? "SIMULATION AKTIV" : "BEREIT"}</span></div><h2 className="mt-5 text-xl font-bold">{szenario.titel}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-[var(--nova-text-schwaecher)]">{szenario.details}</p><button type="button" disabled={szenario.aktiv || Boolean(laedt)} onClick={() => void ausfuehren("simulieren", szenario.id)} className="nova-akzent-verlauf mt-5 w-full rounded-xl px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{laedt === szenario.id ? "Simulation wird vorbereitet ..." : szenario.aktiv ? "Szenario aktiv" : "Szenario simulieren"}</button></article>; })}</section>
  </main>;
}
