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
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/75 p-5 backdrop-blur-sm">
      <section className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] shadow-2xl">
        <header className="flex items-start justify-between gap-5 border-b border-[var(--nova-rand)] p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-[var(--nova-akzent)]">
              Rechnungsdetails
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              {rechnung.rechnungsnummer}
            </h2>
            <p className="mt-1 text-[var(--nova-text-schwaecher)]">
              {rechnung.betreff}
            </p>
          </div>
          <button
            type="button"
            onClick={schliessen}
            className="rounded-xl border border-[var(--nova-rand)] px-4 py-2"
          >
            Schließen
          </button>
        </header>
        <div className="grid gap-5 border-b border-[var(--nova-rand)] p-6 md:grid-cols-2">
          <div>
            <p className="text-sm text-[var(--nova-text-schwaecher)]">
              Kunde / Empfänger
            </p>
            <h3 className="mt-1 text-lg font-bold">{rechnung.kundeName}</h3>
            <p className="mt-2 whitespace-pre-line">
              {rechnung.auftrag?.lieferadresse ??
                "Keine Lieferadresse zugeordnet"}
            </p>
            {rechnung.auftrag && (
              <p className="mt-2 text-sm">
                Auftrag: <b>{rechnung.auftrag.auftragsnummer}</b>
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Detailwert
              label="Rechnungsdatum"
              wert={new Date(rechnung.rechnungsdatum).toLocaleDateString(
                "de-DE",
              )}
            />
            <Detailwert
              label="Fällig"
              wert={new Date(rechnung.faelligAm).toLocaleDateString("de-DE")}
            />
            <Detailwert label="Bruttobetrag" wert={euro(rechnung.bruttowert)} />
            <Detailwert label="Status" wert={rechnung.status} />
          </div>
        </div>
        <div className="p-6">
          <h3 className="mb-3 text-lg font-semibold">Was der Kunde erhält</h3>
          {rechnung.auftrag?.positionen.length ? (
            <div className="overflow-x-auto rounded-xl border border-[var(--nova-rand)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--nova-hintergrund)]">
                  <tr>
                    {[
                      "Artikel",
                      "Größe / Variante",
                      "Menge",
                      "Einzelpreis",
                      "Gesamt",
                    ].map((t) => (
                      <th key={t} className="px-4 py-3 text-left">
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rechnung.auftrag.positionen.map((p) => (
                    <tr
                      key={p.id}
                      className="border-t border-[var(--nova-rand)]"
                    >
                      <td className="px-4 py-3">
                        <b>{p.artikel.artikelnummer}</b>
                        <small className="block text-[var(--nova-text-schwaecher)]">
                          {p.artikel.produktname}
                        </small>
                      </td>
                      <td className="px-4 py-3">
                        {p.artikel.groesse ?? "–"} / {p.artikel.variante ?? "–"}
                      </td>
                      <td className="px-4 py-3">
                        {p.menge.toLocaleString("de-DE")} Stk.
                      </td>
                      <td className="px-4 py-3">{euro(p.einzelpreis)}</td>
                      <td className="px-4 py-3 font-semibold">
                        {euro(p.menge * p.einzelpreis)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-[var(--nova-rand)] p-5 text-[var(--nova-text-schwaecher)]">
              Dieser manuell erstellten Rechnung wurde noch kein Logistikauftrag
              zugeordnet.
            </p>
          )}
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Betrag label="Rechnungsbetrag" wert={rechnung.bruttowert} />
            <Betrag label="Bereits bezahlt" wert={bezahlt} gruen />
            <Betrag label="Noch offen" wert={rest} warnung={rest > 0} />
          </div>
          <div className="mt-6">
            <h3 className="font-semibold">Zahlungsverlauf</h3>
            {rechnung.zahlungen.length ? (
              rechnung.zahlungen.map((z) => (
                <div
                  key={z.id}
                  className="mt-3 flex flex-wrap justify-between gap-3 rounded-xl bg-[var(--nova-hintergrund)] p-4"
                >
                  <span>
                    {new Date(z.gebuchtAm).toLocaleDateString("de-DE")} ·{" "}
                    {z.zahlungsart}
                    {z.referenz ? ` · ${z.referenz}` : ""}
                  </span>
                  <b className="text-emerald-400">{euro(z.betrag)}</b>
                </div>
              ))
            ) : (
              <p className="mt-3 text-sm text-[var(--nova-text-schwaecher)]">
                Noch kein Zahlungseingang vorhanden – deshalb ist der
                vollständige Rechnungsbetrag offen.
              </p>
            )}
          </div>
          {rechnung.status === "TEILBEZAHLT" && (
            <p className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
              Teilbezahlt bedeutet: Es wurde bereits {euro(bezahlt)} gebucht,
              aber {euro(rest)} fehlen noch bis zum vollständigen Ausgleich.
            </p>
          )}
        </div>
      </section>
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
