"use client";

import { useEffect, useMemo, useState } from "react";
import NovaSidebar from "@/components/NovaSidebar";

type Bestellung = { id: number; lieferant: string; status: string; gesamtpositionen: number; erstelltAm: string };

export default function LieferantenPage() {
  const [bestellungen, setBestellungen] = useState<Bestellung[]>([]);
  const [suche, setSuche] = useState("");

  useEffect(() => {
    fetch("/api/bestellungen", { cache: "no-store" }).then((r) => r.json()).then((d) => setBestellungen(Array.isArray(d) ? d : [])).catch(() => setBestellungen([]));
  }, []);

  const lieferanten = useMemo(() => {
    const gruppen = new Map<string, { name: string; bestellungen: number; offen: number; positionen: number; letzteBestellung: string }>();
    for (const b of bestellungen) {
      const schluessel = b.lieferant.trim().toLowerCase();
      const alt = gruppen.get(schluessel) ?? { name: b.lieferant, bestellungen: 0, offen: 0, positionen: 0, letzteBestellung: b.erstelltAm };
      alt.bestellungen += 1;
      alt.positionen += b.gesamtpositionen;
      if (b.status.toLowerCase() === "offen") alt.offen += 1;
      if (new Date(b.erstelltAm) > new Date(alt.letzteBestellung)) alt.letzteBestellung = b.erstelltAm;
      gruppen.set(schluessel, alt);
    }
    return [...gruppen.values()].filter((l) => l.name.toLowerCase().includes(suche.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name, "de"));
  }, [bestellungen, suche]);

  return <main className="min-h-screen bg-[var(--nova-hintergrund)] text-[var(--nova-text)]"><NovaSidebar /><section className="ml-20 px-8 py-8"><div className="mx-auto max-w-7xl"><h1 className="text-4xl font-bold">Lieferanten</h1><p className="mt-2 text-[var(--nova-text-schwaecher)]">Automatisch aus den vorhandenen Bestellungen ermittelte Lieferantenübersicht.</p><input value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Lieferant suchen..." className="mt-8 w-full max-w-md rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] px-4 py-3 outline-none focus:border-[var(--nova-akzent)]" /><div className="mt-5 overflow-hidden rounded-2xl border border-[var(--nova-rand)]"><table className="w-full text-sm"><thead className="bg-[var(--nova-flaeche)]"><tr>{["Lieferant", "Bestellungen", "Offen", "Positionen", "Letzte Bestellung"].map((t) => <th key={t} className="px-5 py-4 text-left">{t}</th>)}</tr></thead><tbody>{lieferanten.map((l) => <tr key={l.name} className="border-t border-[var(--nova-rand)]"><td className="px-5 py-4 font-semibold text-[var(--nova-akzent)]">{l.name}</td><td className="px-5 py-4">{l.bestellungen}</td><td className="px-5 py-4">{l.offen}</td><td className="px-5 py-4">{l.positionen}</td><td className="px-5 py-4">{new Date(l.letzteBestellung).toLocaleDateString("de-DE")}</td></tr>)}{lieferanten.length === 0 && <tr><td colSpan={5} className="px-5 py-14 text-center text-[var(--nova-text-schwaecher)]">Keine Lieferanten gefunden.</td></tr>}</tbody></table></div></div></section></main>;
}
