"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, ChevronDown, ClipboardList, Keyboard, RefreshCw, ScanLine, Wifi, WifiOff, X } from "lucide-react";

type Artikel = { id: number; artikelnummer: string; produktname: string };
type Lagerplatz = { id: number; code: string; bezeichnung: string };
type Ladungstraeger = { id: number; barcode: string; bezeichnung: string };
type GescannterLadungstraeger = {
  barcode: string;
  lagerplatz: Lagerplatz | null;
  traegerIndex?: number;
  traegerGesamt?: number;
  positionen: { artikel: Artikel & { groesse?: string | null; variante?: string | null }; menge: number }[];
};
type Bewegung = { id: number; typ: string; status: string; menge: number; erfasstAm: string; erfasstVon: string | null; artikel: Artikel; vonLagerplatz: Lagerplatz | null; nachLagerplatz: Lagerplatz | null };
type LagerDaten = { lagerplaetze: Lagerplatz[]; ladungstraeger: Ladungstraeger[]; bewegungen: Bewegung[] };
type Bestellposition = { position: number; artikelnummer: string; bezeichnung: string; menge: number; erfasstMenge: number; restMenge: number; erfassungsstatus: "OFFEN" | "TEILWEISE" | "VOLLSTAENDIG" };
type Bestellung = { id: number; bestellnummer: string; lieferscheinnummer: string | null; lieferant: string; status: string; positionen: Bestellposition[] };
type ScanErgebnis = { rawValue: string };
type Detector = { detect: (quelle: ImageBitmapSource) => Promise<ScanErgebnis[]> };
type DetectorKlasse = new (optionen?: { formats?: string[] }) => Detector;

export default function MobileMde() {
  const [daten, setDaten] = useState<LagerDaten | null>(null);
  const [artikel, setArtikel] = useState<Artikel[]>([]);
  const [bestellungen, setBestellungen] = useState<Bestellung[]>([]);
  const [offeneBestellung, setOffeneBestellung] = useState<number | null>(null);
  const [ausgewaehltePosition, setAusgewaehltePosition] = useState<{ bestellungId: number; position: number } | null>(null);
  const [typ, setTyp] = useState("EINGANG");
  const [artikelnummer, setArtikelnummer] = useState("");
  const [menge, setMenge] = useState("1");
  const [von, setVon] = useState("");
  const [nach, setNach] = useState("");
  const [ladungstraeger, setLadungstraeger] = useState("");
  const [gescannterTraeger, setGescannterTraeger] = useState<GescannterLadungstraeger | null>(null);
  const [scanText, setScanText] = useState("");
  const [meldung, setMeldung] = useState("");
  const [fehler, setFehler] = useState("");
  const [sendet, setSendet] = useState(false);
  const [synchronisiertAm, setSynchronisiertAm] = useState<Date | null>(null);
  const [online, setOnline] = useState(true);
  const [kamera, setKamera] = useState(false);
  const [kameraUnterstuetzt, setKameraUnterstuetzt] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const erkenntRef = useRef(false);

  const laden = useCallback(async (still = true) => {
    try {
      if (still) setFehler("");
      const [lagerAntwort, artikelAntwort, bestellAntwort] = await Promise.all([
        fetch(`/api/lager?zeit=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/artikel?zeit=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/bestellungen?zeit=${Date.now()}`, { cache: "no-store" }),
      ]);
      const lagerDaten = await lagerAntwort.json();
      const artikelDaten = await artikelAntwort.json();
      const bestellDaten = await bestellAntwort.json();
      if (!lagerAntwort.ok) throw new Error(lagerDaten.fehler || "MDE-Daten konnten nicht geladen werden.");
      if (!bestellAntwort.ok) throw new Error(bestellDaten.fehler || "Bestellungen konnten nicht geladen werden.");
      setDaten(lagerDaten);
      setArtikel(Array.isArray(artikelDaten) ? artikelDaten : []);
      setBestellungen(Array.isArray(bestellDaten) ? bestellDaten
        .filter((bestellung: Bestellung) => bestellung.status === "Offen")
        .map((bestellung: Bestellung) => ({ ...bestellung, positionen: bestellung.positionen.filter((position) => position.restMenge > 0) }))
        .filter((bestellung: Bestellung) => bestellung.positionen.length > 0) : []);
      setSynchronisiertAm(new Date());
      setOnline(true);
    } catch (error) {
      setOnline(false);
      if (still) setFehler(error instanceof Error ? error.message : "Keine Verbindung zum NOVA-Server.");
    }
  }, []);

  useEffect(() => {
    void laden();
    const onlineSetzen = () => { setOnline(true); void laden(false); };
    const offlineSetzen = () => setOnline(false);
    window.addEventListener("online", onlineSetzen);
    window.addEventListener("offline", offlineSetzen);
    const intervall = window.setInterval(() => { if (document.visibilityState === "visible") void laden(false); }, 5_000);
    return () => { window.clearInterval(intervall); window.removeEventListener("online", onlineSetzen); window.removeEventListener("offline", offlineSetzen); };
  }, [laden]);

  const scanVerarbeiten = useCallback(async (rohwert: string) => {
    const wert = rohwert.trim();
    if (!wert) return;
    setScanText(wert); setFehler(""); setAusgewaehltePosition(null);

    try {
      if (wert.startsWith("{")) {
        const qr = JSON.parse(wert) as { artikelnummer?: string; lagerplatz?: string; ladungstraeger?: string; menge?: number };
        if (qr.artikelnummer) setArtikelnummer(qr.artikelnummer);
        if (qr.menge) setMenge(String(qr.menge));
        if (qr.ladungstraeger) setLadungstraeger(qr.ladungstraeger);
        if (qr.lagerplatz && daten) {
          const platz = daten.lagerplaetze.find((p) => p.code.toLowerCase() === qr.lagerplatz!.toLowerCase());
          if (platz) typ === "AUSGANG" ? setVon(String(platz.id)) : setNach(String(platz.id));
        }
        setMeldung("QR-Code wurde übernommen.");
        return;
      }
    } catch { /* Normalen Barcode weiter prüfen. */ }

    const bereinigt = wert.replace(/^(ART|ARTICLE|LP|LOC|LT|CARRIER):/i, "").trim();
    if (/^NOVA-LT-/i.test(bereinigt)) {
      try {
        const antwort = await fetch(`/api/lager/ladungstraeger?barcode=${encodeURIComponent(bereinigt)}`, { cache: "no-store" });
        const traegerDaten = await antwort.json();
        if (!antwort.ok) throw new Error(traegerDaten.fehler || "Ladungsträger wurde nicht gefunden.");
        setGescannterTraeger(traegerDaten);
        setLadungstraeger(traegerDaten.barcode);
        const position = traegerDaten.positionen?.[0];
        if (position) {
          setArtikelnummer(position.artikel.artikelnummer);
          setMenge(String(position.menge));
        }
        if (traegerDaten.lagerplatz) {
          typ === "AUSGANG" ? setVon(String(traegerDaten.lagerplatz.id)) : setNach(String(traegerDaten.lagerplatz.id));
        }
        setMeldung(`Ladungsträger ${traegerDaten.barcode} erkannt.`);
      } catch (error) {
        setGescannterTraeger(null);
        setFehler(error instanceof Error ? error.message : "Ladungsträger konnte nicht gelesen werden.");
      }
      return;
    }
    const gefundenerArtikel = artikel.find((a) => a.artikelnummer.toLowerCase() === bereinigt.toLowerCase());
    if (gefundenerArtikel) { setArtikelnummer(gefundenerArtikel.artikelnummer); setMeldung(`Artikel ${gefundenerArtikel.artikelnummer} erkannt.`); return; }
    const platz = daten?.lagerplaetze.find((p) => p.code.toLowerCase() === bereinigt.toLowerCase());
    if (platz) { typ === "AUSGANG" ? setVon(String(platz.id)) : setNach(String(platz.id)); setMeldung(`Lagerplatz ${platz.code} erkannt.`); return; }
    const traeger = daten?.ladungstraeger.find((t) => t.barcode.toLowerCase() === bereinigt.toLowerCase());
    if (traeger) { setLadungstraeger(traeger.barcode); setMeldung(`Ladungsträger ${traeger.barcode} erkannt.`); return; }
    setArtikelnummer(bereinigt);
    setMeldung("Scan wurde als Artikelnummer übernommen.");
  }, [artikel, daten, typ]);

  const kameraStoppen = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((spur) => spur.stop());
    streamRef.current = null; frameRef.current = null; erkenntRef.current = false; setKamera(false);
  }, []);

  async function kameraStarten() {
    setFehler("");
    const DetectorCtor = (window as unknown as { BarcodeDetector?: DetectorKlasse }).BarcodeDetector;
    if (!DetectorCtor || !navigator.mediaDevices?.getUserMedia) {
      setKameraUnterstuetzt(false); setFehler("Die Kamera-Erkennung wird von diesem Browser nicht unterstützt. Der Handscanner und die manuelle Eingabe funktionieren weiterhin."); return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream; setKamera(true);
      await new Promise((resolve) => setTimeout(resolve, 50));
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream; await videoRef.current.play();
      const detector = new DetectorCtor({ formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "data_matrix"] });
      const erkennen = async () => {
        if (!videoRef.current || !streamRef.current) return;
        if (!erkenntRef.current && videoRef.current.readyState >= 2) {
          erkenntRef.current = true;
          try {
            const treffer = await detector.detect(videoRef.current);
            if (treffer[0]?.rawValue) { void scanVerarbeiten(treffer[0].rawValue); kameraStoppen(); return; }
          } catch { /* Nächsten Frame versuchen. */ } finally { erkenntRef.current = false; }
        }
        frameRef.current = requestAnimationFrame(erkennen);
      };
      frameRef.current = requestAnimationFrame(erkennen);
    } catch { setFehler("Die Kamera konnte nicht geöffnet werden. Bitte Kameraberechtigung prüfen."); kameraStoppen(); }
  }

  useEffect(() => () => kameraStoppen(), [kameraStoppen]);

  async function buchen(event: FormEvent) {
    event.preventDefault(); setSendet(true); setFehler(""); setMeldung("");
    try {
      const antwort = await fetch("/api/lager", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aktion: "mde-erfassen", typ, artikelnummer, menge, vonLagerplatzId: von || null, nachLagerplatzId: nach || null, ladungstraegerCode: ladungstraeger || null, bestellungId: ausgewaehltePosition?.bestellungId ?? null, bestellposition: ausgewaehltePosition?.position ?? null, notiz: "Mobile MDE-Erfassung" }) });
      const ergebnis = await antwort.json();
      if (!antwort.ok) throw new Error(ergebnis.fehler || "Buchung fehlgeschlagen.");
      setMeldung("MDE-Vorgang wurde erfasst und an die PC-Bestätigung gesendet.");
      setArtikelnummer(""); setMenge("1"); setScanText(""); setAusgewaehltePosition(null);
      await laden(false);
    } catch (error) { setFehler(error instanceof Error ? error.message : "Buchung fehlgeschlagen."); }
    finally { setSendet(false); }
  }

  const letzte = daten?.bewegungen.slice(0, 8) ?? [];
  function positionUebernehmen(bestellungId: number, position: Bestellposition) {
    setTyp("EINGANG");
    setArtikelnummer(position.artikelnummer);
    setMenge(String(position.restMenge));
    setAusgewaehltePosition({ bestellungId, position: position.position });
    setMeldung(`${position.artikelnummer}: Restmenge ${position.restMenge} Stück wurde übernommen.`);
    setFehler("");
  }

  return <main className="min-h-screen bg-[var(--nova-hintergrund)] text-[var(--nova-text)]">
    <header className="sticky top-0 z-20 border-b border-[var(--nova-rand)] bg-[var(--nova-flaeche)]/95 px-4 py-3 backdrop-blur"><div className="mx-auto flex max-w-2xl items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--nova-akzent)]">NOVA Mobile</p><h1 className="text-xl font-bold">MDE-Erfassung</h1></div><div className="flex items-center gap-3"><span className={`flex items-center gap-1 text-xs ${online ? "text-emerald-400" : "text-red-400"}`}>{online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}{online ? "Live" : "Offline"}</span><Link href="/lager" className="rounded-lg border border-[var(--nova-rand)] px-3 py-2 text-sm">Lager</Link></div></div></header>
    <div className="mx-auto max-w-2xl space-y-4 p-4 pb-12">
      <div className="flex items-center justify-between rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] px-4 py-3 text-xs text-[var(--nova-text-schwaecher)]"><span>{synchronisiertAm ? `Synchronisiert ${synchronisiertAm.toLocaleTimeString("de-DE")}` : "Synchronisierung läuft …"}</span><button onClick={() => void laden()} className="flex items-center gap-2 text-[var(--nova-akzent)]"><RefreshCw className="h-4 w-4" /> Aktualisieren</button></div>
      {meldung && <div className="flex gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400"><CheckCircle2 className="h-5 w-5 shrink-0" />{meldung}</div>}
      {fehler && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">{fehler}</div>}
      {gescannterTraeger && <section className="rounded-2xl border border-[var(--nova-akzent)]/50 bg-[var(--nova-flaeche)] p-4">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-[var(--nova-akzent)]">Ladungsträger erkannt</p><h2 className="mt-1 font-bold">{gescannterTraeger.barcode}</h2></div><button type="button" onClick={() => setGescannterTraeger(null)} className="rounded-lg border border-[var(--nova-rand)] p-2"><X className="h-4 w-4" /></button></div>
        <p className="mt-3 text-sm text-[var(--nova-text-schwaecher)]">Lagerplatz: <b className="text-[var(--nova-text)]">{gescannterTraeger.lagerplatz ? `${gescannterTraeger.lagerplatz.code} · ${gescannterTraeger.lagerplatz.bezeichnung}` : "Nicht zugeordnet"}</b></p>
        <div className="mt-3 space-y-2">{gescannterTraeger.positionen.map((position) => <div key={position.artikel.id} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--nova-hintergrund)] p-3"><div><b>{position.artikel.artikelnummer}</b><p className="text-xs text-[var(--nova-text-schwaecher)]">{position.artikel.produktname}{position.artikel.groesse ? ` · Gr. ${position.artikel.groesse}` : ""}{position.artikel.variante ? ` · ${position.artikel.variante}` : ""}</p></div><strong className="text-lg text-[var(--nova-akzent)]">{position.menge} Stk.</strong></div>)}</div>
      </section>}

      <section className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-4">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-5 w-5 text-[var(--nova-akzent)]" />
          <div><h2 className="font-semibold">Offene Bestellungen</h2><p className="text-xs text-[var(--nova-text-schwaecher)]">Position antippen und direkt am MDE erfassen.</p></div>
          <span className="ml-auto rounded-full bg-[var(--nova-akzent)]/15 px-2.5 py-1 text-xs font-semibold text-[var(--nova-akzent)]">{bestellungen.length}</span>
        </div>
        <div className="mt-4 space-y-2">
          {bestellungen.map((bestellung) => {
            const istOffen = offeneBestellung === bestellung.id;
            return <div key={bestellung.id} className="overflow-hidden rounded-xl border border-[var(--nova-rand)]">
              <button type="button" onClick={() => setOffeneBestellung(istOffen ? null : bestellung.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--nova-flaeche-hover)]">
                <div className="min-w-0"><b className="block truncate">{bestellung.bestellnummer}</b><p className="truncate text-xs text-[var(--nova-text-schwaecher)]">{bestellung.lieferscheinnummer ?? "Kein Lieferschein"} · {bestellung.lieferant}</p></div>
                <ChevronDown className={`ml-auto h-4 w-4 shrink-0 transition-transform ${istOffen ? "rotate-180" : ""}`} />
              </button>
              {istOffen && <div className="space-y-2 border-t border-[var(--nova-rand)] p-3">
                {bestellung.positionen.map((position) => <button type="button" key={position.position} onClick={() => positionUebernehmen(bestellung.id, position)} className="flex w-full items-center justify-between gap-3 rounded-lg bg-[var(--nova-hintergrund)] p-3 text-left transition hover:ring-1 hover:ring-[var(--nova-akzent)]">
                  <div><b className="text-[var(--nova-akzent)]">{position.artikelnummer}</b><p className="mt-1 text-xs text-[var(--nova-text-schwaecher)]">{position.bezeichnung}</p>{position.erfasstMenge > 0 && <p className="mt-1 text-xs text-amber-400">Teilweise erfasst: {position.erfasstMenge} von {position.menge} Stk.</p>}</div><span className="shrink-0 font-semibold">Rest {position.restMenge} Stk.</span>
                </button>)}
              </div>}
            </div>;
          })}
          {bestellungen.length === 0 && <p className="rounded-xl bg-[var(--nova-hintergrund)] p-4 text-sm text-[var(--nova-text-schwaecher)]">Keine offenen Bestellungen vorhanden.</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-4">
        <div className="grid grid-cols-2 gap-3"><button onClick={() => void kameraStarten()} className="flex items-center justify-center gap-2 rounded-xl bg-[var(--nova-akzent)] px-4 py-4 font-semibold text-white"><Camera className="h-5 w-5" /> Kamera scannen</button><label className="flex items-center justify-center gap-2 rounded-xl border border-[var(--nova-rand)] px-4 py-4 font-semibold"><Keyboard className="h-5 w-5" /> Handscanner<input autoFocus value={scanText} onChange={(e) => setScanText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void scanVerarbeiten(scanText); } }} className="absolute h-px w-px opacity-0" /></label></div>
        {!kameraUnterstuetzt && <p className="mt-3 text-xs text-amber-400">Kamera nicht verfügbar – Handscanner und manuelle Eingabe sind aktiv.</p>}
      </section>

      {kamera && <div className="fixed inset-0 z-50 flex flex-col bg-black"><div className="flex items-center justify-between p-4 text-white"><b>Barcode oder QR-Code erfassen</b><button onClick={kameraStoppen} className="rounded-full bg-white/15 p-2"><X /></button></div><div className="relative flex flex-1 items-center justify-center overflow-hidden"><video ref={videoRef} playsInline muted className="h-full w-full object-cover" /><div className="pointer-events-none absolute h-56 w-[80%] max-w-sm rounded-2xl border-2 border-[var(--nova-akzent)]"><ScanLine className="absolute -top-10 left-1/2 -translate-x-1/2 text-white" /></div></div><p className="p-5 text-center text-sm text-white">Code vollständig innerhalb des Rahmens halten</p></div>}

      <form onSubmit={buchen} className="space-y-4 rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5">
        <div className="grid grid-cols-3 gap-2">{[["EINGANG", "Eingang"], ["AUSGANG", "Ausgang"], ["UMLAGERUNG", "Umlagerung"]].map(([wert, text]) => <button key={wert} type="button" onClick={() => setTyp(wert)} className={`rounded-xl px-2 py-3 text-sm font-semibold transition ${typ === wert ? "bg-[var(--nova-akzent)] text-white" : "bg-[var(--nova-hintergrund)] text-[var(--nova-text-schwaecher)]"}`}>{text}</button>)}</div>
        <MdeFeld label="Artikelnummer / Barcode" wert={artikelnummer} setzen={(wert) => { setArtikelnummer(wert); setAusgewaehltePosition(null); }} />
        <MdeFeld label="Menge" wert={menge} setzen={setMenge} typ="number" />
        {(typ === "AUSGANG" || typ === "UMLAGERUNG") && <MdeAuswahl label="Von Lagerplatz" wert={von} setzen={setVon} plaetze={daten?.lagerplaetze ?? []} />}
        {(typ === "EINGANG" || typ === "UMLAGERUNG") && <MdeAuswahl label="Nach Lagerplatz" wert={nach} setzen={setNach} plaetze={daten?.lagerplaetze ?? []} />}
        <MdeFeld label="Ladungsträger (optional)" wert={ladungstraeger} setzen={setLadungstraeger} erforderlich={false} />
        <button disabled={sendet || !online} className="w-full rounded-xl bg-[var(--nova-akzent)] px-5 py-4 text-lg font-bold text-white transition active:scale-[0.98] disabled:opacity-50">{sendet ? "Wird übertragen …" : "MDE-Vorgang erfassen"}</button>
      </form>

      <section className="rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-5"><h2 className="font-semibold">Letzte Live-Vorgänge</h2><div className="mt-4 space-y-3">{letzte.map((b) => <div key={b.id} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--nova-hintergrund)] p-3 text-sm"><div><b>{b.typ} · {b.artikel.artikelnummer}</b><p className="text-xs text-[var(--nova-text-schwaecher)]">{b.vonLagerplatz?.code ?? "Extern"} → {b.nachLagerplatz?.code ?? "Extern"} · {new Date(b.erfasstAm).toLocaleTimeString("de-DE")}</p></div><span className={`rounded-full px-2 py-1 text-xs ${b.status === "ERFASST" ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400"}`}>{b.status}</span></div>)}{letzte.length === 0 && <p className="text-sm text-[var(--nova-text-schwaecher)]">Noch keine Vorgänge vorhanden.</p>}</div></section>
    </div>
  </main>;
}

function MdeFeld({ label, wert, setzen, typ = "text", erforderlich = true }: { label: string; wert: string; setzen: (wert: string) => void; typ?: string; erforderlich?: boolean }) { return <label className="block text-sm font-medium">{label}<input required={erforderlich} type={typ} min={typ === "number" ? "0.01" : undefined} step="any" value={wert} onChange={(e) => setzen(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-4 py-4 text-lg outline-none focus:border-[var(--nova-akzent)]" /></label>; }
function MdeAuswahl({ label, wert, setzen, plaetze }: { label: string; wert: string; setzen: (wert: string) => void; plaetze: Lagerplatz[] }) { return <label className="block text-sm font-medium">{label}<select required value={wert} onChange={(e) => setzen(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-4 py-4 text-lg outline-none focus:border-[var(--nova-akzent)]"><option value="">Bitte auswählen</option>{plaetze.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.bezeichnung}</option>)}</select></label>; }
