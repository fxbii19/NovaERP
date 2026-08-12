"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import NovaSidebar from "@/components/NovaSidebar";
import { useAuth } from "@/hooks/useAuth";

type Artikel = { id: number; artikelnummer: string; produktname: string };
type Lagerplatz = {
  id: number;
  code: string;
  bezeichnung: string;
  bereich: string;
  typ: string;
  aktiv: boolean;
  bestaende: { id: number; menge: number; artikel: Artikel }[];
};
type Bewegung = {
  id: number;
  typ: string;
  status: string;
  menge: number;
  lieferscheinnummer: string | null;
  ladungstraegerCode: string | null;
  erfasstVon: string | null;
  erfasstAm: string;
  artikel: Artikel;
  vonLagerplatz: Lagerplatz | null;
  nachLagerplatz: Lagerplatz | null;
};
type Inventur = {
  id: number;
  sollMenge: number;
  istMenge: number;
  differenz: number;
  status: string;
  artikel: Artikel;
  lagerplatz: Lagerplatz;
};
type Ladungstraeger = {
  id: number;
  barcode: string;
  bezeichnung: string;
  lagerplatz: Lagerplatz | null;
  positionen: { id: number; menge: number; artikel: Artikel }[];
};
type LagerDaten = {
  lagerplaetze: Lagerplatz[];
  bewegungen: Bewegung[];
  inventuren: Inventur[];
  ladungstraeger: Ladungstraeger[];
};

export type LagerModus =
  | "uebersicht"
  | "lagerplaetze"
  | "mde"
  | "produktzugang"
  | "umlagerungen"
  | "inventur"
  | "ladungstraeger";

const TITEL: Record<LagerModus, [string, string]> = {
  uebersicht: ["Lager", "Zentrale Übersicht aller Lagerprozesse"],
  lagerplaetze: ["Lagerplätze", "Bestände nach Bereich und Lagerplatz"],
  mde: ["MDE-Erfassung", "Wareneingang oder Warenausgang mobil vorerfassen"],
  produktzugang: ["PC-Bestätigung", "MDE-Erfassungen prüfen und mit Lieferschein buchen"],
  umlagerungen: ["Umlagerungen", "Bestand nachvollziehbar zwischen Lagerplätzen bewegen"],
  inventur: ["Inventur", "Soll-/Ist-Bestand und Differenzen je Lagerplatz"],
  ladungstraeger: ["Barcode / MDE", "Ladungsträger, Artikelinhalt und Zielplatz abfragen"],
};

export default function LagerModul({ modus }: { modus: LagerModus }) {
  const { user, istAdmin } = useAuth();
  const [daten, setDaten] = useState<LagerDaten | null>(null);
  const [artikel, setArtikel] = useState<Artikel[]>([]);
  const [laedt, setLaedt] = useState(true);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [formular, setFormular] = useState<Record<string, string>>({
    typ: "EINGANG",
    menge: "1",
  });

  const laden = useCallback(async () => {
    try {
      setLaedt(true);
      const [lagerAntwort, artikelAntwort] = await Promise.all([
        fetch("/api/lager", { cache: "no-store" }),
        fetch("/api/artikel", { cache: "no-store" }),
      ]);
      const lagerDaten = await lagerAntwort.json();
      const artikelDaten = await artikelAntwort.json();
      if (!lagerAntwort.ok) throw new Error(lagerDaten.fehler);
      setDaten(lagerDaten);
      setArtikel(Array.isArray(artikelDaten) ? artikelDaten : []);
    } catch (error) {
      setFehler(error instanceof Error ? error.message : "Lagerdaten konnten nicht geladen werden.");
    } finally {
      setLaedt(false);
    }
  }, []);

  useEffect(() => void laden(), [laden]);

  async function aktionSenden(aktion: string, zusaetzlich: Record<string, unknown> = {}) {
    setFehler(null);
    setMeldung(null);
    const antwort = await fetch("/api/lager", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ aktion, ...formular, ...zusaetzlich }),
    });
    const ergebnis = await antwort.json();
    if (!antwort.ok) {
      setFehler(ergebnis.fehler ?? "Aktion fehlgeschlagen.");
      return false;
    }
    setMeldung("Vorgang wurde erfolgreich gespeichert.");
    await laden();
    return true;
  }

  const offeneBewegungen = daten?.bewegungen.filter((eintrag) => eintrag.status === "ERFASST") ?? [];
  const bestandGesamt = useMemo(
    () => daten?.lagerplaetze.reduce((summe, platz) => summe + platz.bestaende.reduce((teil, bestand) => teil + bestand.menge, 0), 0) ?? 0,
    [daten],
  );
  const [titel, untertitel] = TITEL[modus];

  return (
    <main className="min-h-screen bg-[var(--nova-hintergrund)] text-[var(--nova-text)]">
      <NovaSidebar />
      <section className="ml-20 min-w-0 px-8 py-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-4xl font-bold">{titel}</h1>
          <p className="mt-2 text-[var(--nova-text-schwaecher)]">{untertitel}</p>

          {meldung && <Hinweis farbe="gruen">{meldung}</Hinweis>}
          {fehler && <Hinweis farbe="rot">{fehler}</Hinweis>}
          {laedt && <Hinweis>Lagerdaten werden geladen...</Hinweis>}

          {!laedt && daten && modus === "uebersicht" && (
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <Kennzahl titel="Lagerplätze" wert={daten.lagerplaetze.length} />
              <Kennzahl titel="Gesamtbestand" wert={bestandGesamt} />
              <Kennzahl titel="Offene MDE-Vorgänge" wert={offeneBewegungen.length} />
              <Kennzahl titel="Offene Inventurdifferenzen" wert={daten.inventuren.filter((i) => i.status === "OFFEN" && i.differenz !== 0).length} />
            </div>
          )}

          {!laedt && daten && modus === "lagerplaetze" && (
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {daten.lagerplaetze.map((platz) => (
                <div key={platz.id} className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div><h2 className="text-lg font-semibold">{platz.code}</h2><p className="text-sm text-[var(--nova-text-schwaecher)]">{platz.bezeichnung}</p></div>
                    <span className="rounded-full bg-[var(--nova-akzent-transparent)] px-3 py-1 text-xs text-[var(--nova-akzent)]">{platz.bereich}</span>
                  </div>
                  <p className="mt-5 text-2xl font-bold">{zahl(platz.bestaende.reduce((summe, b) => summe + b.menge, 0))}</p>
                  <p className="text-xs text-[var(--nova-text-schwaecher)]">{platz.bestaende.length} unterschiedliche Artikel</p>
                  <div className="mt-4 max-h-36 space-y-2 overflow-auto text-sm">
                    {platz.bestaende.map((bestand) => <div key={bestand.id} className="flex justify-between"><span className="truncate">{bestand.artikel.artikelnummer}</span><b>{zahl(bestand.menge)}</b></div>)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!laedt && daten && (modus === "mde" || modus === "umlagerungen") && (
            <MdeFormular
              umlagerung={modus === "umlagerungen"}
              formular={formular}
              setFormular={setFormular}
              lagerplaetze={daten.lagerplaetze}
              onSenden={async (event) => {
                event.preventDefault();
                const erfolgreich = await aktionSenden("mde-erfassen", {
                  typ: modus === "umlagerungen" ? "UMLAGERUNG" : formular.typ,
                });
                if (erfolgreich) setFormular({ typ: "EINGANG", menge: "1" });
              }}
            />
          )}

          {!laedt && daten && modus === "produktzugang" && (
            <div className="mt-8 space-y-4">
              {offeneBewegungen.length === 0 && <LeererText text="Keine offenen MDE-Erfassungen vorhanden." />}
              {offeneBewegungen.map((bewegung) => (
                <BestaetigungsKarte key={bewegung.id} bewegung={bewegung} onBestaetigen={(lieferscheinnummer) => aktionSenden("bewegung-bestaetigen", { id: bewegung.id, lieferscheinnummer })} />
              ))}
            </div>
          )}

          {!laedt && daten && modus === "inventur" && (
            <InventurBereich
              daten={daten}
              artikel={artikel}
              formular={formular}
              setFormular={setFormular}
              istAdmin={istAdmin}
              onErfassen={(event) => { event.preventDefault(); void aktionSenden("inventur-erfassen"); }}
              onBuchen={(id) => void aktionSenden("inventur-buchen", { id })}
            />
          )}

          {!laedt && daten && modus === "ladungstraeger" && (
            <LadungstraegerBereich daten={daten} artikel={artikel} formular={formular} setFormular={setFormular} onSpeichern={(event) => { event.preventDefault(); void aktionSenden("ladungstraeger-speichern"); }} onPosition={(event) => { event.preventDefault(); void aktionSenden("ladungstraeger-position"); }} />
          )}
        </div>
      </section>
    </main>
  );
}

function MdeFormular({ umlagerung, formular, setFormular, lagerplaetze, onSenden }: { umlagerung: boolean; formular: Record<string, string>; setFormular: React.Dispatch<React.SetStateAction<Record<string, string>>>; lagerplaetze: Lagerplatz[]; onSenden: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form onSubmit={onSenden} className="mt-8 grid gap-5 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-6 md:grid-cols-2">
    {!umlagerung && <Auswahl label="Vorgang" wert={formular.typ ?? "EINGANG"} onChange={(wert) => setFormular((a) => ({ ...a, typ: wert }))} optionen={[["EINGANG", "Wareneingang"], ["AUSGANG", "Warenausgang"]]} />}
    <Feld label="Artikelnummer / Scan" wert={formular.artikelnummer ?? ""} onChange={(wert) => setFormular((a) => ({ ...a, artikelnummer: wert }))} />
    <Feld label="Menge" typ="number" wert={formular.menge ?? "1"} onChange={(wert) => setFormular((a) => ({ ...a, menge: wert }))} />
    {(umlagerung || formular.typ === "AUSGANG") && <Auswahl label="Von Lagerplatz" wert={formular.vonLagerplatzId ?? ""} onChange={(wert) => setFormular((a) => ({ ...a, vonLagerplatzId: wert }))} optionen={lagerplaetze.map((p) => [String(p.id), `${p.code} · ${p.bezeichnung}`])} />}
    {(umlagerung || formular.typ !== "AUSGANG") && <Auswahl label="Nach Lagerplatz" wert={formular.nachLagerplatzId ?? ""} onChange={(wert) => setFormular((a) => ({ ...a, nachLagerplatzId: wert }))} optionen={lagerplaetze.map((p) => [String(p.id), `${p.code} · ${p.bezeichnung}`])} />}
    <Feld label="Ladungsträger-Barcode" wert={formular.ladungstraegerCode ?? ""} onChange={(wert) => setFormular((a) => ({ ...a, ladungstraegerCode: wert }))} />
    <div className="md:col-span-2"><PrimaerButton text="Mit MDE erfassen" /></div>
  </form>;
}

function BestaetigungsKarte({ bewegung, onBestaetigen }: { bewegung: Bewegung; onBestaetigen: (lieferschein: string) => Promise<boolean> }) {
  const [lieferschein, setLieferschein] = useState("");
  return <div className="grid gap-4 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5 lg:grid-cols-[1fr_240px_auto] lg:items-end">
    <div><b>{bewegung.typ} · {bewegung.artikel.artikelnummer}</b><p className="mt-1 text-sm text-[var(--nova-text-schwaecher)]">{bewegung.artikel.produktname} · Menge {zahl(bewegung.menge)} · {bewegung.vonLagerplatz?.code ?? "Extern"} → {bewegung.nachLagerplatz?.code ?? "Extern"}</p></div>
    <Feld label={bewegung.typ === "EINGANG" ? "Lieferscheinnummer *" : "Belegnummer"} wert={lieferschein} onChange={setLieferschein} />
    <button type="button" onClick={() => void onBestaetigen(lieferschein)} className="rounded-xl bg-[var(--nova-akzent)] px-5 py-3 font-semibold text-white">Am PC bestätigen</button>
  </div>;
}

function InventurBereich({ daten, artikel, formular, setFormular, istAdmin, onErfassen, onBuchen }: { daten: LagerDaten; artikel: Artikel[]; formular: Record<string, string>; setFormular: React.Dispatch<React.SetStateAction<Record<string, string>>>; istAdmin: boolean; onErfassen: (event: FormEvent<HTMLFormElement>) => void; onBuchen: (id: number) => void }) {
  return <><form onSubmit={onErfassen} className="mt-8 grid gap-4 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5 md:grid-cols-4 md:items-end">
    <Auswahl label="Lagerplatz" wert={formular.lagerplatzId ?? ""} onChange={(v) => setFormular((a) => ({ ...a, lagerplatzId: v }))} optionen={daten.lagerplaetze.map((p) => [String(p.id), p.code])} />
    <Auswahl label="Artikel" wert={formular.artikelId ?? ""} onChange={(v) => setFormular((a) => ({ ...a, artikelId: v }))} optionen={artikel.map((a) => [String(a.id), `${a.artikelnummer} · ${a.produktname}`])} />
    <Feld label="Gezählte Ist-Menge" typ="number" wert={formular.istMenge ?? ""} onChange={(v) => setFormular((a) => ({ ...a, istMenge: v }))} />
    <PrimaerButton text="Zählung speichern" />
  </form><div className="mt-6 overflow-auto rounded-2xl border border-[var(--nova-rand)]"><table className="w-full text-sm"><thead className="bg-[var(--nova-flaeche)]"><tr>{["Lagerplatz", "Artikel", "Soll", "Ist", "Differenz", "Status", "Aktion"].map((t) => <th key={t} className="px-4 py-3 text-left">{t}</th>)}</tr></thead><tbody>{daten.inventuren.map((i) => <tr key={i.id} className="border-t border-[var(--nova-rand)]"><td className="px-4 py-3">{i.lagerplatz.code}</td><td className="px-4 py-3">{i.artikel.artikelnummer}</td><td className="px-4 py-3">{zahl(i.sollMenge)}</td><td className="px-4 py-3">{zahl(i.istMenge)}</td><td className={`px-4 py-3 font-bold ${i.differenz === 0 ? "text-emerald-400" : "text-amber-400"}`}>{zahl(i.differenz)}</td><td className="px-4 py-3">{i.status}</td><td className="px-4 py-3">{istAdmin && i.status === "OFFEN" ? <button onClick={() => onBuchen(i.id)} className="rounded-lg bg-[var(--nova-akzent)] px-3 py-2 text-white">Differenz buchen</button> : "–"}</td></tr>)}</tbody></table></div></>;
}

function LadungstraegerBereich({ daten, artikel, formular, setFormular, onSpeichern, onPosition }: { daten: LagerDaten; artikel: Artikel[]; formular: Record<string, string>; setFormular: React.Dispatch<React.SetStateAction<Record<string, string>>>; onSpeichern: (event: FormEvent<HTMLFormElement>) => void; onPosition: (event: FormEvent<HTMLFormElement>) => void }) {
  return <><form onSubmit={onSpeichern} className="mt-8 grid gap-4 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5 md:grid-cols-4 md:items-end"><Feld label="Barcode scannen" wert={formular.barcode ?? ""} onChange={(v) => setFormular((a) => ({ ...a, barcode: v }))} /><Feld label="Bezeichnung" wert={formular.bezeichnung ?? ""} onChange={(v) => setFormular((a) => ({ ...a, bezeichnung: v }))} /><Auswahl label="Vorgesehener Lagerplatz" wert={formular.lagerplatzId ?? ""} onChange={(v) => setFormular((a) => ({ ...a, lagerplatzId: v }))} optionen={daten.lagerplaetze.map((p) => [String(p.id), p.code])} /><PrimaerButton text="Ladungsträger speichern" /></form>
  <form onSubmit={onPosition} className="mt-5 grid gap-4 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5 md:grid-cols-4 md:items-end"><Auswahl label="Ladungsträger" wert={formular.ladungstraegerId ?? ""} onChange={(v) => setFormular((a) => ({ ...a, ladungstraegerId: v }))} optionen={daten.ladungstraeger.map((t) => [String(t.id), `${t.barcode} · ${t.bezeichnung}`])} /><Auswahl label="Artikel auf Ladungsträger" wert={formular.artikelId ?? ""} onChange={(v) => setFormular((a) => ({ ...a, artikelId: v }))} optionen={artikel.map((a) => [String(a.id), `${a.artikelnummer} · ${a.produktname}`])} /><Feld label="Menge" typ="number" wert={formular.menge ?? "1"} onChange={(v) => setFormular((a) => ({ ...a, menge: v }))} /><PrimaerButton text="Artikel zuordnen" /></form>
  <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{daten.ladungstraeger.map((t) => <div key={t.id} className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5"><b className="text-lg">{t.barcode}</b><p className="text-sm text-[var(--nova-text-schwaecher)]">{t.bezeichnung}</p><p className="mt-4">Ziel: <b>{t.lagerplatz?.code ?? "Nicht zugeordnet"}</b></p><div className="mt-3 text-sm">{t.positionen.length ? t.positionen.map((p) => <p key={p.id}>{p.artikel.artikelnummer} · {zahl(p.menge)}</p>) : <span className="text-[var(--nova-text-schwaecher)]">Noch keine Artikel erfasst</span>}</div></div>)}</div></>;
}

function Feld({ label, wert, onChange, typ = "text" }: { label: string; wert: string; onChange: (wert: string) => void; typ?: string }) { return <label className="block text-sm"><span className="mb-2 block font-medium">{label}</span><input required type={typ} step="any" value={wert} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-4 py-3 outline-none focus:border-[var(--nova-akzent)]" /></label>; }
function Auswahl({ label, wert, onChange, optionen }: { label: string; wert: string; onChange: (wert: string) => void; optionen: string[][] }) { return <label className="block text-sm"><span className="mb-2 block font-medium">{label}</span><select required value={wert} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-4 py-3 outline-none focus:border-[var(--nova-akzent)]"><option value="">Bitte auswählen</option>{optionen.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>; }
function PrimaerButton({ text }: { text: string }) { return <button type="submit" className="w-full rounded-xl bg-[var(--nova-akzent)] px-5 py-3 font-semibold text-white">{text}</button>; }
function Kennzahl({ titel, wert }: { titel: string; wert: number }) { return <div className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-6"><p className="text-sm text-[var(--nova-text-schwaecher)]">{titel}</p><p className="mt-3 text-3xl font-bold">{zahl(wert)}</p></div>; }
function Hinweis({ children, farbe = "normal" }: { children: React.ReactNode; farbe?: "normal" | "gruen" | "rot" }) { return <div className={`mt-6 rounded-xl border p-4 text-sm ${farbe === "gruen" ? "border-emerald-800 bg-emerald-950/40 text-emerald-300" : farbe === "rot" ? "border-red-900 bg-red-950/50 text-red-300" : "border-[var(--nova-rand)] bg-[var(--nova-flaeche)] text-[var(--nova-text-schwaecher)]"}`}>{children}</div>; }
function LeererText({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-[var(--nova-rand)] p-12 text-center text-[var(--nova-text-schwaecher)]">{text}</div>; }
function zahl(wert: number) { return Number(wert).toLocaleString("de-DE", { maximumFractionDigits: 2 }); }
