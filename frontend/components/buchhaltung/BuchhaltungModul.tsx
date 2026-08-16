"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import NovaSidebar from "@/components/NovaSidebar";
type Modus = "uebersicht" | "rechnungen" | "zahlungen";
type Kunde = { id: number; firmenname: string };
type Zahlung = {
  id: number;
  betrag: number;
  zahlungsart: string;
  referenz: string | null;
  gebuchtVon: string | null;
  gebuchtAm: string;
};
type Auftragsposition = {
  id: number;
  menge: number;
  einzelpreis: number;
  artikel: {
    id: number;
    artikelnummer: string;
    produktname: string;
    groesse: string | null;
    variante: string | null;
  };
};
type Auftrag = {
  id: number;
  auftragsnummer: string;
  kunde: string;
  lieferadresse: string | null;
  kundenreferenz: string | null;
  positionen: Auftragsposition[];
};
type Rechnung = {
  id: number;
  rechnungsnummer: string;
  kundeName: string;
  betreff: string;
  nettowert: number;
  steuersatz: number;
  bruttowert: number;
  status: string;
  faelligAm: string;
  rechnungsdatum: string;
  zahlungen: Zahlung[];
  auftrag: Auftrag | null;
};
type Daten = { rechnungen: Rechnung[]; kunden: Kunde[] };
const TITEL: Record<Modus, [string, string]> = {
  uebersicht: [
    "Buchhaltung",
    "Rechnungen, Zahlungseingänge und offene Posten im Überblick",
  ],
  rechnungen: ["Rechnungen", "Ausgangsrechnungen erstellen und überwachen"],
  zahlungen: [
    "Zahlungseingänge",
    "Zahlungen verbuchen und offene Beträge ausgleichen",
  ],
};
export default function BuchhaltungModul({ modus }: { modus: Modus }) {
  const [daten, setDaten] = useState<Daten | null>(null);
  const [fehler, setFehler] = useState("");
  const [sendet, setSendet] = useState(false);
  const [zielRechnungId, setZielRechnungId] = useState<number | null>(null);
  const [uebersichtsfilter, setUebersichtsfilter] = useState<"alle" | "offene-rechnungen" | "offene-posten" | "ueberfaellig" | "heute-bezahlt">("alle");
  const [rechnung, setRechnung] = useState({
    kundeId: "",
    betreff: "",
    nettowert: "",
    steuersatz: "19",
    faelligAm: "",
  });
  const [zahlung, setZahlung] = useState({
    rechnungId: "",
    betrag: "",
    zahlungsart: "Überweisung",
    referenz: "",
  });
  const laden = useCallback(async () => {
    try {
      const r = await fetch("/api/buchhaltung", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.fehler);
      setDaten(d);
      setFehler("");
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
    }
  }, []);
  useEffect(() => {
    void laden();
  }, [laden]);
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get("rechnung"));
    if (Number.isInteger(id) && id > 0) setZielRechnungId(id);
  }, []);
  async function senden(aktion: string, inhalt: object) {
    setSendet(true);
    try {
      const r = await fetch("/api/buchhaltung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktion, ...inhalt }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.fehler);
      await laden();
      return true;
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      return false;
    } finally {
      setSendet(false);
    }
  }
  async function rechnungSpeichern(e: FormEvent) {
    e.preventDefault();
    if (await senden("rechnung-anlegen", rechnung))
      setRechnung({
        kundeId: "",
        betreff: "",
        nettowert: "",
        steuersatz: "19",
        faelligAm: "",
      });
  }
  async function zahlungSpeichern(e: FormEvent) {
    e.preventDefault();
    if (await senden("zahlung-buchen", zahlung))
      setZahlung({
        rechnungId: "",
        betrag: "",
        zahlungsart: "Überweisung",
        referenz: "",
      });
  }
  const restbetrag = (r: Rechnung) =>
    Math.max(
      0,
      Math.round(
        (r.bruttowert -
          r.zahlungen.reduce((summe, zahlung) => summe + zahlung.betrag, 0)) *
          100,
      ) / 100,
    );
  const offen = daten?.rechnungen.filter((r) => restbetrag(r) >= 0.01) ?? [];
  const ausgewaehlt = offen.find((r) => String(r.id) === zahlung.rechnungId);
  const maximalOffen = ausgewaehlt ? restbetrag(ausgewaehlt) : 0;
  const offeneSumme = offen.reduce(
    (s, r) =>
      s +
      restbetrag(r),
    0,
  );
  const ueberfaellig = offen.filter(
    (r) => new Date(r.faelligAm) < new Date(),
  ).length;
  const heute =
    daten?.rechnungen
      .flatMap((r) => r.zahlungen)
      .filter(
        (z) =>
          new Date(z.gebuchtAm).toDateString() === new Date().toDateString(),
      )
      .reduce((s, z) => s + z.betrag, 0) ?? 0;
  const heuteRechnungen =
    daten?.rechnungen.filter((r) =>
      r.zahlungen.some(
        (z) => new Date(z.gebuchtAm).toDateString() === new Date().toDateString(),
      ),
    ) ?? [];
  const uebersichtRechnungen =
    uebersichtsfilter === "offene-rechnungen" || uebersichtsfilter === "offene-posten"
      ? offen
      : uebersichtsfilter === "ueberfaellig"
        ? offen.filter((r) => new Date(r.faelligAm) < new Date())
        : uebersichtsfilter === "heute-bezahlt"
          ? heuteRechnungen
          : daten?.rechnungen.slice(0, 10) ?? [];
  const [titel, untertitel] = TITEL[modus];
  return (
    <main className="min-h-screen bg-[var(--nova-hintergrund)] text-[var(--nova-text)]">
      <NovaSidebar />
      <section className="ml-20 px-8 py-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[.2em] text-[var(--nova-akzent)]">
            Finanzen
          </p>
          <h1 className="mt-2 text-4xl font-bold">{titel}</h1>
          <p className="mt-2 text-[var(--nova-text-schwaecher)]">
            {untertitel}
          </p>
          {fehler && (
            <p className="mt-6 rounded-xl bg-red-500/10 p-4 text-red-300">
              {fehler}
            </p>
          )}
          {daten && modus === "uebersicht" && (
            <>
              <div className="mt-8 grid gap-4 md:grid-cols-4">
                <Karte t="Offene Rechnungen" w={offen.length.toString()} aktiv={uebersichtsfilter === "offene-rechnungen"} onClick={() => setUebersichtsfilter(uebersichtsfilter === "offene-rechnungen" ? "alle" : "offene-rechnungen")} />
                <Karte t="Offene Posten" w={euro(offeneSumme)} aktiv={uebersichtsfilter === "offene-posten"} onClick={() => setUebersichtsfilter(uebersichtsfilter === "offene-posten" ? "alle" : "offene-posten")} />
                <Karte t="Überfällig" w={ueberfaellig.toString()} aktiv={uebersichtsfilter === "ueberfaellig"} onClick={() => setUebersichtsfilter(uebersichtsfilter === "ueberfaellig" ? "alle" : "ueberfaellig")} />
                <Karte t="Heute bezahlt" w={euro(heute)} aktiv={uebersichtsfilter === "heute-bezahlt"} onClick={() => setUebersichtsfilter(uebersichtsfilter === "heute-bezahlt" ? "alle" : "heute-bezahlt")} />
              </div>
              {uebersichtsfilter !== "alle" && <div className="mt-5 flex items-center justify-between rounded-xl border border-[var(--nova-akzent)]/30 bg-[var(--nova-akzent)]/10 px-4 py-3 text-sm"><span>Aktiver Filter: <b>{uebersichtsfilter === "heute-bezahlt" ? "Heute bezahlt" : uebersichtsfilter === "ueberfaellig" ? "Überfällige Rechnungen" : "Offene Rechnungen und Posten"}</b></span><button type="button" onClick={() => setUebersichtsfilter("alle")} className="font-semibold text-[var(--nova-akzent)]">Alle anzeigen</button></div>}
              <Liste rechnungen={uebersichtRechnungen} zielRechnungId={zielRechnungId} />
            </>
          )}
          {daten && modus === "rechnungen" && (
            <>
              <Form titel="Rechnung anlegen">
                <form
                  onSubmit={rechnungSpeichern}
                  className="grid gap-4 md:grid-cols-5"
                >
                  <Select
                    label="Kunde *"
                    wert={rechnung.kundeId}
                    set={(v) => setRechnung({ ...rechnung, kundeId: v })}
                  >
                    <option value="">Auswählen</option>
                    {daten.kunden.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.firmenname}
                      </option>
                    ))}
                  </Select>
                  <Feld
                    label="Betreff *"
                    wert={rechnung.betreff}
                    set={(v) => setRechnung({ ...rechnung, betreff: v })}
                  />
                  <Feld
                    label="Nettowert *"
                    typ="number"
                    wert={rechnung.nettowert}
                    set={(v) => setRechnung({ ...rechnung, nettowert: v })}
                  />
                  <Feld
                    label="Steuersatz %"
                    typ="number"
                    wert={rechnung.steuersatz}
                    set={(v) => setRechnung({ ...rechnung, steuersatz: v })}
                  />
                  <Feld
                    label="Fällig am"
                    typ="date"
                    wert={rechnung.faelligAm}
                    set={(v) => setRechnung({ ...rechnung, faelligAm: v })}
                  />
                  <Button sendet={sendet} text="Rechnung erstellen" />
                </form>
              </Form>
              <Liste rechnungen={daten.rechnungen} zielRechnungId={zielRechnungId} />
            </>
          )}
          {daten && modus === "zahlungen" && (
            <>
              <Form titel="Zahlung verbuchen">
                <form
                  onSubmit={zahlungSpeichern}
                  className="grid gap-4 md:grid-cols-4"
                >
                  <Select
                    label="Offene Rechnung *"
                    wert={zahlung.rechnungId}
                    set={(v) =>
                      setZahlung({ ...zahlung, rechnungId: v, betrag: "" })
                    }
                  >
                    <option value="">Auswählen</option>
                    {offen.map((r) => {
                      const rest = Math.max(
                        0,
                        r.bruttowert -
                          r.zahlungen.reduce((s, z) => s + z.betrag, 0),
                      );
                      return (
                        <option key={r.id} value={r.id}>
                          {r.rechnungsnummer} · offen {euro(rest)}
                        </option>
                      );
                    })}
                  </Select>
                  <label className="text-sm">
                    <span className="mb-2 block">
                      Betrag *
                      {ausgewaehlt ? ` · maximal ${euro(maximalOffen)}` : ""}
                    </span>
                    <input
                      required
                      type="number"
                      min="0.01"
                      max={ausgewaehlt ? maximalOffen : undefined}
                      step="0.01"
                      value={zahlung.betrag}
                      onChange={(e) =>
                        setZahlung({ ...zahlung, betrag: e.target.value })
                      }
                      className="w-full rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-4 py-3"
                    />
                  </label>
                  <Select
                    label="Zahlungsart"
                    wert={zahlung.zahlungsart}
                    set={(v) => setZahlung({ ...zahlung, zahlungsart: v })}
                  >
                    <option>Überweisung</option>
                    <option>Lastschrift</option>
                    <option>Bar</option>
                    <option>PayPal</option>
                  </Select>
                  <Feld
                    label="Referenz"
                    wert={zahlung.referenz}
                    set={(v) => setZahlung({ ...zahlung, referenz: v })}
                  />
                  <Button sendet={sendet} text="Zahlung buchen" />
                </form>
              </Form>
              <Liste rechnungen={offen} zielRechnungId={zielRechnungId} />
            </>
          )}
          {!daten && !fehler && (
            <p className="mt-8">Buchhaltung wird geladen...</p>
          )}
        </div>
      </section>
    </main>
  );
}
function euro(v: number) {
  return v.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}
function Karte({ t, w, aktiv, onClick }: { t: string; w: string; aktiv: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`group cursor-pointer rounded-2xl border bg-[var(--nova-flaeche)] p-6 text-left transition hover:-translate-y-0.5 hover:border-[var(--nova-akzent)] hover:shadow-lg ${aktiv ? "border-[var(--nova-akzent)] ring-2 ring-[var(--nova-akzent)]/20" : "border-[var(--nova-rand)]"}`}>
      <p className="text-sm text-[var(--nova-text-schwaecher)]">{t}</p>
      <p className="mt-3 text-2xl font-bold">{w}</p>
      <p className="mt-2 text-xs text-[var(--nova-text-schwaecher)]">{aktiv ? "Filter aktiv" : "Anklicken für Details"}</p>
    </button>
  );
}
function Form({
  titel,
  children,
}: {
  titel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-6">
      <h2 className="mb-5 text-xl font-semibold">{titel}</h2>
      {children}
    </section>
  );
}
function Liste({ rechnungen, zielRechnungId }: { rechnungen: Rechnung[]; zielRechnungId?: number | null }) {
  const [offen, setOffen] = useState<Rechnung | null>(null);
  useEffect(() => {
    if (!zielRechnungId) return;
    const ziel = rechnungen.find((rechnung) => rechnung.id === zielRechnungId);
    if (ziel) setOffen(ziel);
  }, [rechnungen, zielRechnungId]);
  return (
    <>
      <section className="mt-8 overflow-hidden rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)]">
        <div className="grid grid-cols-6 gap-3 border-b border-[var(--nova-rand)] px-5 py-4 text-sm font-semibold">
          <span>Rechnung</span>
          <span>Kunde</span>
          <span>Brutto</span>
          <span>Bezahlt</span>
          <span>Offen</span>
          <span>Status</span>
        </div>
        {rechnungen.map((r) => {
          const bezahlt = r.zahlungen.reduce((summe, z) => summe + z.betrag, 0),
            rest = Math.max(0, r.bruttowert - bezahlt);
          return (
            <button
              type="button"
              onClick={() => setOffen(r)}
              key={r.id}
              className="grid w-full grid-cols-6 gap-3 border-t border-[var(--nova-rand)] px-5 py-4 text-left transition first:border-0 hover:bg-[var(--nova-flaeche-hover)]"
            >
              <b className="text-[var(--nova-akzent)]">{r.rechnungsnummer}</b>
              <span>{r.kundeName}</span>
              <span>{euro(r.bruttowert)}</span>
              <span className="text-emerald-400">{euro(bezahlt)}</span>
              <span
                className={
                  rest > 0 ? "font-semibold text-amber-400" : "text-emerald-400"
                }
              >
                {euro(rest)}
              </span>
              <span
                className={
                  r.status === "BEZAHLT"
                    ? "text-emerald-400"
                    : new Date(r.faelligAm) < new Date()
                      ? "text-red-400"
                      : "text-amber-400"
                }
              >
                {r.status}
              </span>
            </button>
          );
        })}
        {rechnungen.length === 0 && (
          <p className="p-8 text-center text-[var(--nova-text-schwaecher)]">
            Keine Rechnungen vorhanden.
          </p>
        )}
      </section>
      {offen && (
        <Rechnungsdetail rechnung={offen} schliessen={() => setOffen(null)} />
      )}
    </>
  );
}
function Rechnungsdetail({
  rechnung,
  schliessen,
}: {
  rechnung: Rechnung;
  schliessen: () => void;
}) {
  const bezahlt = rechnung.zahlungen.reduce((summe, z) => summe + z.betrag, 0),
    rest = Math.max(0, rechnung.bruttowert - bezahlt);
  const steuer = rechnung.bruttowert - rechnung.nettowert;
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 p-5 backdrop-blur-sm">
      <style jsx global>{`@media print { body * { visibility: hidden !important; } .nova-rechnung-papier, .nova-rechnung-papier * { visibility: visible !important; } .nova-rechnung-papier { position: absolute !important; inset: 0 !important; width: 210mm !important; min-height: 297mm !important; margin: 0 !important; box-shadow: none !important; border: 0 !important; } .rechnung-werkzeuge { display: none !important; } }`}</style>
      <div className="rechnung-werkzeuge mx-auto mb-4 flex w-full max-w-[900px] justify-end gap-3">
        <button type="button" onClick={() => window.print()} className="rounded-xl bg-[var(--nova-akzent)] px-5 py-3 font-semibold text-white">Drucken / als PDF speichern</button>
        <button type="button" onClick={schliessen} className="rounded-xl border border-white/20 bg-slate-900 px-5 py-3 font-semibold text-white">Schließen</button>
      </div>
      <article className="nova-rechnung-papier mx-auto min-h-[1120px] w-full max-w-[900px] bg-white px-16 py-14 text-slate-900 shadow-2xl">
        <header className="flex items-start justify-between border-b-2 border-slate-900 pb-10">
          <div><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-3xl font-black text-white">N</div><p className="mt-3 text-xl font-black tracking-wide">NOVA ERP</p><p className="text-xs uppercase tracking-[.2em] text-slate-500">Workflow Automation</p></div>
          <div className="text-right"><h2 className="text-4xl font-light uppercase tracking-[.12em]">Rechnung</h2><p className="mt-4 text-lg font-bold">{rechnung.rechnungsnummer}</p><p className="mt-1 text-sm text-slate-500">{rechnung.betreff}</p></div>
        </header>
        <section className="mt-10 grid grid-cols-[1.3fr_1fr] gap-16">
          <div><p className="mb-3 text-[10px] uppercase tracking-[.18em] text-slate-500">Rechnung an</p><h3 className="text-lg font-bold">{rechnung.kundeName}</h3><p className="mt-2 whitespace-pre-line text-sm leading-6">{rechnung.auftrag?.lieferadresse ?? "Keine Lieferadresse zugeordnet"}</p></div>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-3 text-sm"><dt className="text-slate-500">Rechnungsdatum</dt><dd className="text-right font-semibold">{new Date(rechnung.rechnungsdatum).toLocaleDateString("de-DE")}</dd><dt className="text-slate-500">Fällig am</dt><dd className="text-right font-semibold">{new Date(rechnung.faelligAm).toLocaleDateString("de-DE")}</dd><dt className="text-slate-500">Auftrag</dt><dd className="text-right font-semibold">{rechnung.auftrag?.auftragsnummer ?? "–"}</dd><dt className="text-slate-500">Kundenreferenz</dt><dd className="text-right font-semibold">{rechnung.auftrag?.kundenreferenz ?? "–"}</dd></dl>
        </section>
        <table className="mt-12 w-full text-sm">
          <thead><tr className="border-y-2 border-slate-900 text-left text-xs uppercase tracking-wider"><th className="py-3">Pos.</th><th>Artikel / Beschreibung</th><th>Größe / Variante</th><th className="text-right">Menge</th><th className="text-right">Einzelpreis</th><th className="text-right">Gesamt</th></tr></thead>
          <tbody>{rechnung.auftrag?.positionen.length ? rechnung.auftrag.positionen.map((p, index) => <tr key={p.id} className="border-b border-slate-200 align-top"><td className="py-4">{index + 1}</td><td className="py-4"><b>{p.artikel.artikelnummer}</b><span className="mt-1 block text-xs text-slate-500">{p.artikel.produktname}</span></td><td className="py-4">{p.artikel.groesse ?? "–"} / {p.artikel.variante ?? "–"}</td><td className="py-4 text-right">{p.menge.toLocaleString("de-DE")} Stk.</td><td className="py-4 text-right">{euro(p.einzelpreis)}</td><td className="py-4 text-right font-semibold">{euro(p.menge * p.einzelpreis)}</td></tr>) : <tr><td colSpan={6} className="py-8 text-center text-slate-500">Keine Auftragspositionen zugeordnet.</td></tr>}</tbody>
        </table>
        <section className="mt-8 ml-auto w-full max-w-sm text-sm"><div className="flex justify-between border-b border-slate-200 py-2"><span>Nettobetrag</span><b>{euro(rechnung.nettowert)}</b></div><div className="flex justify-between border-b border-slate-200 py-2"><span>Umsatzsteuer {rechnung.steuersatz.toLocaleString("de-DE")} %</span><b>{euro(steuer)}</b></div><div className="flex justify-between border-b-2 border-slate-900 py-4 text-xl"><span>Gesamtbetrag</span><b>{euro(rechnung.bruttowert)}</b></div>{bezahlt > 0 && <div className="flex justify-between py-2 text-emerald-700"><span>Bereits bezahlt</span><b>− {euro(bezahlt)}</b></div>}<div className="flex justify-between bg-slate-100 px-3 py-3 text-lg"><span>Noch offen</span><b>{euro(rest)}</b></div></section>
        <section className="mt-12 border-t border-slate-300 pt-6 text-sm leading-6"><p>Bitte überweisen Sie den offenen Betrag bis zum <b>{new Date(rechnung.faelligAm).toLocaleDateString("de-DE")}</b> unter Angabe der Rechnungsnummer <b>{rechnung.rechnungsnummer}</b>.</p><p className="mt-3 font-semibold">Zahlungsstatus: {rechnung.status}</p></section>
        <footer className="mt-14 grid grid-cols-3 gap-8 border-t border-slate-300 pt-5 text-[10px] leading-4 text-slate-500"><p><b className="text-slate-700">NOVA ERP Demo GmbH</b><br/>Innovationsstraße 1<br/>10115 Berlin</p><p><b className="text-slate-700">Bankverbindung</b><br/>NOVA Demo Bank<br/>IBAN DE00 0000 0000 0000 0000 00</p><p><b className="text-slate-700">Kontakt</b><br/>rechnung@nova-test.de<br/>www.nova-erp.de</p></footer>
      </article>
    </div>
  );
}
function Detailwert({ label, wert }: { label: string; wert: string }) {
  return (
    <div>
      <p className="text-sm text-[var(--nova-text-schwaecher)]">{label}</p>
      <b className="mt-1 block">{wert}</b>
    </div>
  );
}
function Betrag({
  label,
  wert,
  gruen,
  warnung,
}: {
  label: string;
  wert: number;
  gruen?: boolean;
  warnung?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--nova-rand)] p-4">
      <p className="text-sm text-[var(--nova-text-schwaecher)]">{label}</p>
      <p
        className={`mt-2 text-xl font-bold ${gruen ? "text-emerald-400" : warnung ? "text-amber-400" : ""}`}
      >
        {euro(wert)}
      </p>
    </div>
  );
}
function Feld({
  label,
  wert,
  set,
  typ = "text",
}: {
  label: string;
  wert: string;
  set: (v: string) => void;
  typ?: string;
}) {
  return (
    <label className="text-sm">
      <span className="mb-2 block">{label}</span>
      <input
        required={label.includes("*")}
        type={typ}
        step={typ === "number" ? "0.01" : undefined}
        value={wert}
        onChange={(e) => set(e.target.value)}
        className="w-full rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-4 py-3"
      />
    </label>
  );
}
function Select({
  label,
  wert,
  set,
  children,
}: {
  label: string;
  wert: string;
  set: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="text-sm">
      <span className="mb-2 block">{label}</span>
      <select
        required={label.includes("*")}
        value={wert}
        onChange={(e) => set(e.target.value)}
        className="w-full rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-4 py-3"
      >
        {children}
      </select>
    </label>
  );
}
function Button({ sendet, text }: { sendet: boolean; text: string }) {
  return (
    <button
      disabled={sendet}
      className="rounded-xl bg-[var(--nova-akzent)] px-5 py-3 font-semibold text-white"
    >
      {sendet ? "Speichert..." : text}
    </button>
  );
}
