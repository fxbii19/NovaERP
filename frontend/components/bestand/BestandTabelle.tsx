"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

export type DatenbankArtikel = {
  id: number;
  artikelnummer: string;
  produktname: string;
  suchbegriff: string | null;
  groesse: string | null;
  variante: string | null;
  bestand: number;
  reserviert: number;
  verfuegbar: number;
  bestellt: number;
  inAuftrag: number;
  mindestbestand: number;
  lagerortverwaltung: boolean;
  aktiv: boolean;
  ladungstraegerAnzahl: number;
};

type BestandTabelleProps = {
  artikel: DatenbankArtikel[];
  istAdmin: boolean;
  rolle: string;
  initialerBestandsstatus?: string;
  onAktualisieren: () => Promise<void>;
};

const ARTIKEL_PRO_LADESCHRITT = 50;
const SPALTEN_SPEICHER = "nova-bestand-spaltenbreiten";
const REIHENFOLGE_SPEICHER = "nova-bestand-spaltenreihenfolge";
const SICHTBARKEIT_SPEICHER = "nova-bestand-ausgeblendete-spalten";
const SORTIERUNG_SPEICHER = "nova-bestand-sortierung";

const SPALTEN = [
  { id: "artikelnummer", titel: "Artikelnummer" },
  { id: "produktname", titel: "Produktname" },
  { id: "groesse", titel: "Größe" },
  { id: "variante", titel: "Variante" },
  { id: "suchbegriff", titel: "Suchbegriff" },
  { id: "bestand", titel: "Bestand", rechts: true },
  { id: "reserviert", titel: "Reserviert", rechts: true },
  { id: "verfuegbar", titel: "Verfügbar", rechts: true },
  { id: "bestellt", titel: "Bestellt", rechts: true },
  { id: "inAuftrag", titel: "In Auftrag", rechts: true },
  { id: "ladungstraegerAnzahl", titel: "Ladungsträger", rechts: true },
  {
    id: "mindestbestand",
    titel: "Mindestbestand",
    rechts: true,
  },
  {
    id: "lagerortverwaltung",
    titel: "Lagerortverwaltung",
  },
] as const;

type SpaltenId = (typeof SPALTEN)[number]["id"];

type Sortierung = {
  spalte: SpaltenId;
  richtung: "aufsteigend" | "absteigend";
};

const STANDARD_SPALTENBREITEN: Record<SpaltenId, number> = {
  artikelnummer: 160,
  produktname: 320,
  groesse: 110,
  variante: 140,
  suchbegriff: 260,
  bestand: 120,
  reserviert: 120,
  verfuegbar: 130,
  bestellt: 120,
  inAuftrag: 130,
  ladungstraegerAnzahl: 150,
  mindestbestand: 150,
  lagerortverwaltung: 180,
};

function zahlFormatieren(
  wert: number | null | undefined,
): string {
  return Number(wert ?? 0).toLocaleString("de-DE", {
    maximumFractionDigits: 2,
  });
}

function ArtikelZelle({
  spalte,
  eintrag,
}: {
  spalte: SpaltenId;
  eintrag: DatenbankArtikel;
}) {
  switch (spalte) {
    case "artikelnummer":
      return (
        <td className="whitespace-nowrap px-5 py-4 font-medium text-[var(--nova-akzent)]">
          {eintrag.artikelnummer || "-"}
        </td>
      );

    case "produktname":
      return (
        <td className="truncate px-5 py-4 text-[var(--nova-text)]">
          {eintrag.produktname || "-"}
        </td>
      );

    case "groesse":
      return (
        <td className="whitespace-nowrap px-5 py-4 text-[var(--nova-text)]">
          {eintrag.groesse || "-"}
        </td>
      );

    case "variante":
      return (
        <td className="whitespace-nowrap px-5 py-4 text-[var(--nova-text)]">
          {eintrag.variante || "-"}
        </td>
      );

    case "suchbegriff":
      return (
        <td className="truncate px-5 py-4 text-[var(--nova-text-schwaecher)]">
          {eintrag.suchbegriff || "-"}
        </td>
      );

    case "bestand":
      return (
        <td className="whitespace-nowrap px-5 py-4 text-right text-[var(--nova-text)]">
          {zahlFormatieren(eintrag.bestand)}
        </td>
      );

    case "reserviert":
      return (
        <td className="whitespace-nowrap px-5 py-4 text-right text-[var(--nova-akzent)]">
          {zahlFormatieren(eintrag.reserviert)}
        </td>
      );

    case "verfuegbar": {
      const kritisch = eintrag.verfuegbar <= 0;
      const unterMindestbestand =
        eintrag.mindestbestand > 0 &&
        eintrag.verfuegbar < eintrag.mindestbestand;
      const niedrig =
        !kritisch &&
        !unterMindestbestand &&
        eintrag.verfuegbar < 10;

      return (
        <td className="whitespace-nowrap px-5 py-4 text-right text-[var(--nova-text)]">
          <span
            className={`inline-flex min-w-20 justify-end rounded-lg px-2.5 py-1 font-semibold ${
              kritisch
                ? "bg-red-500 text-white"
                : unterMindestbestand || niedrig
                  ? "bg-amber-400 text-black"
                  : "bg-emerald-500 text-white"
            }`}
          >
            {zahlFormatieren(eintrag.verfuegbar)}
          </span>
        </td>
      );
    }

    case "bestellt":
      return (
        <td className="whitespace-nowrap px-5 py-4 text-right text-[var(--nova-text)]">
          {zahlFormatieren(eintrag.bestellt)}
        </td>
      );

    case "inAuftrag":
      return (
        <td className="whitespace-nowrap px-5 py-4 text-right text-[var(--nova-text)]">
          {zahlFormatieren(eintrag.inAuftrag)}
        </td>
      );

    case "ladungstraegerAnzahl":
      return (
        <td className="whitespace-nowrap px-5 py-4 text-right text-[var(--nova-text)]">
          <span className="rounded-full bg-[var(--nova-akzent-transparent)] px-3 py-1 font-semibold text-[var(--nova-akzent)]">
            {eintrag.ladungstraegerAnzahl.toLocaleString("de-DE")}
          </span>
        </td>
      );

    case "mindestbestand":
      return (
        <td className="whitespace-nowrap px-5 py-4 text-right text-[var(--nova-text)]">
          {zahlFormatieren(eintrag.mindestbestand)}
        </td>
      );

    case "lagerortverwaltung":
      return (
        <td className="px-5 py-4 text-[var(--nova-text)]">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
              eintrag.lagerortverwaltung
                ? "bg-[var(--nova-akzent-transparent)] text-[var(--nova-akzent)]"
                : "bg-[var(--nova-flaeche-hover)] text-[var(--nova-text-schwaecher)]"
            }`}
          >
            {eintrag.lagerortverwaltung ? "Aktiv" : "Nein"}
          </span>
        </td>
      );
  }
}

export default function BestandTabelle({
  artikel,
  istAdmin,
  rolle,
  initialerBestandsstatus = "alle",
  onAktualisieren,
}: BestandTabelleProps) {
  const [suche, setSuche] = useState("");
  const [sichtbareAnzahl, setSichtbareAnzahl] =
    useState(ARTIKEL_PRO_LADESCHRITT);
  const [spaltenbreiten, setSpaltenbreiten] = useState(
    STANDARD_SPALTENBREITEN,
  );
  const [spaltenReihenfolge, setSpaltenReihenfolge] = useState<
    SpaltenId[]
  >(SPALTEN.map((spalte) => spalte.id));
  const [gezogeneSpalte, setGezogeneSpalte] =
    useState<SpaltenId | null>(null);
  const [ausgeblendeteSpalten, setAusgeblendeteSpalten] = useState<
    SpaltenId[]
  >([]);
  const [spaltenmenueOffen, setSpaltenmenueOffen] =
    useState(false);
  const [filtermenueOffen, setFiltermenueOffen] = useState(false);
  const [bestandsstatus, setBestandsstatus] = useState(initialerBestandsstatus);
  const [groessenfilter, setGroessenfilter] = useState("alle");
  const [variantenfilter, setVariantenfilter] = useState("alle");
  const [sortierung, setSortierung] =
    useState<Sortierung | null>(null);
  const [ausgewaehlteIds, setAusgewaehlteIds] = useState<number[]>([]);
  const [detailArtikel, setDetailArtikel] =
    useState<DatenbankArtikel | null>(null);
  const [bearbeitung, setBearbeitung] = useState<Record<string, string>>({});
  const [speichert, setSpeichert] = useState(false);
  const [bearbeitungsfehler, setBearbeitungsfehler] =
    useState<string | null>(null);

  const sortierteSpalten = useMemo(
    () =>
      spaltenReihenfolge
        .map((id) => SPALTEN.find((spalte) => spalte.id === id))
        .filter(
          (spalte): spalte is (typeof SPALTEN)[number] =>
            spalte !== undefined,
        ),
    [spaltenReihenfolge],
  );

  const sichtbareSpalten = useMemo(
    () =>
      sortierteSpalten.filter(
        (spalte) => !ausgeblendeteSpalten.includes(spalte.id),
      ),
    [ausgeblendeteSpalten, sortierteSpalten],
  );

  const tabellenbreite = useMemo(
    () =>
      sichtbareSpalten.reduce(
        (summe, spalte) => summe + spaltenbreiten[spalte.id],
        0,
      ),
    [sichtbareSpalten, spaltenbreiten],
  );

  const groessen = useMemo(
    () =>
      Array.from(
        new Set(
          artikel
            .map((eintrag) => eintrag.groesse?.trim())
            .filter((wert): wert is string => Boolean(wert)),
        ),
      ).sort((a, b) => a.localeCompare(b, "de", { numeric: true })),
    [artikel],
  );

  const varianten = useMemo(
    () =>
      Array.from(
        new Set(
          artikel
            .map((eintrag) => eintrag.variante?.trim())
            .filter((wert): wert is string => Boolean(wert)),
        ),
      ).sort((a, b) => a.localeCompare(b, "de", { numeric: true })),
    [artikel],
  );

  const aktiveFilter = [bestandsstatus, groessenfilter, variantenfilter].filter(
    (wert) => wert !== "alle",
  ).length;

  const gefilterteArtikel = useMemo(() => {
    const suchtext = suche.trim().toLowerCase();

    return artikel.filter((eintrag) => {
      const passtZurSuche =
        !suchtext ||
        eintrag.produktname
          .toLowerCase()
          .includes(suchtext) ||
        (eintrag.suchbegriff ?? "")
          .toLowerCase()
          .includes(suchtext) ||
        eintrag.artikelnummer
          .toLowerCase()
          .includes(suchtext) ||
        (eintrag.groesse ?? "")
          .toLowerCase()
          .includes(suchtext) ||
        (eintrag.variante ?? "")
          .toLowerCase()
          .includes(suchtext);

      const passtZumStatus =
        bestandsstatus === "alle" ||
        (bestandsstatus === "verfuegbar" && eintrag.verfuegbar > 0) ||
        (bestandsstatus === "leer" && eintrag.verfuegbar <= 0) ||
        (bestandsstatus === "kritisch" &&
          eintrag.mindestbestand > 0 &&
          eintrag.verfuegbar <= eintrag.mindestbestand);

      const passtZurGroesse =
        groessenfilter === "alle" || eintrag.groesse === groessenfilter;
      const passtZurVariante =
        variantenfilter === "alle" || eintrag.variante === variantenfilter;

      return (
        passtZurSuche &&
        passtZumStatus &&
        passtZurGroesse &&
        passtZurVariante
      );
    });
  }, [
    artikel,
    bestandsstatus,
    groessenfilter,
    suche,
    variantenfilter,
  ]);

  const sortierteArtikel = useMemo(() => {
    if (!sortierung) {
      return gefilterteArtikel;
    }

    return [...gefilterteArtikel].sort((links, rechts) => {
      const linkerWert = links[sortierung.spalte];
      const rechterWert = rechts[sortierung.spalte];

      let vergleich = 0;

      if (
        typeof linkerWert === "number" &&
        typeof rechterWert === "number"
      ) {
        vergleich = linkerWert - rechterWert;
      } else if (
        typeof linkerWert === "boolean" &&
        typeof rechterWert === "boolean"
      ) {
        vergleich = Number(linkerWert) - Number(rechterWert);
      } else {
        vergleich = String(linkerWert ?? "").localeCompare(
          String(rechterWert ?? ""),
          "de",
          {
            numeric: true,
            sensitivity: "base",
          },
        );
      }

      return sortierung.richtung === "aufsteigend"
        ? vergleich
        : -vergleich;
    });
  }, [gefilterteArtikel, sortierung]);

  const sichtbareArtikel = useMemo(() => {
    return sortierteArtikel.slice(0, sichtbareAnzahl);
  }, [sichtbareAnzahl, sortierteArtikel]);

  const weitereArtikelVorhanden =
    sichtbareArtikel.length < sortierteArtikel.length;

  useEffect(() => {
    setSichtbareAnzahl(ARTIKEL_PRO_LADESCHRITT);
  }, [
    artikel,
    bestandsstatus,
    groessenfilter,
    suche,
    sortierung,
    variantenfilter,
  ]);

  useEffect(() => {
    try {
      const gespeichert = window.localStorage.getItem(
        SPALTEN_SPEICHER,
      );

      if (!gespeichert) {
        return;
      }

      const geladeneBreiten = JSON.parse(gespeichert) as Partial<
        Record<SpaltenId, number>
      >;

      setSpaltenbreiten({
        ...STANDARD_SPALTENBREITEN,
        ...geladeneBreiten,
      });
    } catch {
      window.localStorage.removeItem(SPALTEN_SPEICHER);
    }
  }, []);

  useEffect(() => {
    try {
      const gespeichert = window.localStorage.getItem(
        SORTIERUNG_SPEICHER,
      );

      if (!gespeichert) {
        return;
      }

      const geladen = JSON.parse(gespeichert) as Sortierung;
      const gueltigeSpalte = SPALTEN.some(
        (spalte) => spalte.id === geladen.spalte,
      );
      const gueltigeRichtung =
        geladen.richtung === "aufsteigend" ||
        geladen.richtung === "absteigend";

      if (gueltigeSpalte && gueltigeRichtung) {
        setSortierung(geladen);
      }
    } catch {
      window.localStorage.removeItem(SORTIERUNG_SPEICHER);
    }
  }, []);

  useEffect(() => {
    try {
      const gespeichert = window.localStorage.getItem(
        SICHTBARKEIT_SPEICHER,
      );

      if (!gespeichert) {
        return;
      }

      const gespeicherteIds = JSON.parse(gespeichert) as unknown;

      if (!Array.isArray(gespeicherteIds)) {
        return;
      }

      const gueltigeIds = new Set<SpaltenId>(
        SPALTEN.map((spalte) => spalte.id),
      );

      setAusgeblendeteSpalten(
        gespeicherteIds.filter(
          (id): id is SpaltenId =>
            typeof id === "string" && gueltigeIds.has(id as SpaltenId),
        ),
      );
    } catch {
      window.localStorage.removeItem(SICHTBARKEIT_SPEICHER);
    }
  }, []);

  useEffect(() => {
    try {
      const gespeichert = window.localStorage.getItem(
        REIHENFOLGE_SPEICHER,
      );

      if (!gespeichert) {
        return;
      }

      const geladeneReihenfolge = JSON.parse(gespeichert) as unknown;

      if (!Array.isArray(geladeneReihenfolge)) {
        return;
      }

      const gueltigeIds = new Set<SpaltenId>(
        SPALTEN.map((spalte) => spalte.id),
      );
      const bekannteIds = geladeneReihenfolge.filter(
        (id): id is SpaltenId =>
          typeof id === "string" && gueltigeIds.has(id as SpaltenId),
      );
      const fehlendeIds = SPALTEN.map((spalte) => spalte.id).filter(
        (id) => !bekannteIds.includes(id),
      );

      setSpaltenReihenfolge([...bekannteIds, ...fehlendeIds]);
    } catch {
      window.localStorage.removeItem(REIHENFOLGE_SPEICHER);
    }
  }, []);

  function tabelleScrollen(event: React.UIEvent<HTMLDivElement>) {
    const bereich = event.currentTarget;
    const abstandZumEnde =
      bereich.scrollHeight - bereich.scrollTop - bereich.clientHeight;

    if (abstandZumEnde < 300 && weitereArtikelVorhanden) {
      setSichtbareAnzahl((anzahl) =>
        Math.min(
          anzahl + ARTIKEL_PRO_LADESCHRITT,
          sortierteArtikel.length,
        ),
      );
    }
  }

  function sucheAendern(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    setSuche(event.target.value);
  }

  function spaltenbreiteAendern(
    spalte: SpaltenId,
    event: React.MouseEvent<HTMLDivElement>,
  ) {
    event.preventDefault();

    const startX = event.clientX;
    const startBreite = spaltenbreiten[spalte];

    function mausBewegen(mausEvent: MouseEvent) {
      const neueBreite = Math.max(
        80,
        startBreite + mausEvent.clientX - startX,
      );

      setSpaltenbreiten((aktuell) => {
        const naechsteBreiten = {
          ...aktuell,
          [spalte]: neueBreite,
        };

        window.localStorage.setItem(
          SPALTEN_SPEICHER,
          JSON.stringify(naechsteBreiten),
        );

        return naechsteBreiten;
      });
    }

    function mausLoslassen() {
      document.removeEventListener("mousemove", mausBewegen);
      document.removeEventListener("mouseup", mausLoslassen);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", mausBewegen);
    document.addEventListener("mouseup", mausLoslassen);
  }

  function spalteVerschieben(ziel: SpaltenId) {
    if (!gezogeneSpalte || gezogeneSpalte === ziel) {
      return;
    }

    setSpaltenReihenfolge((aktuell) => {
      const ohneGezogeneSpalte = aktuell.filter(
        (id) => id !== gezogeneSpalte,
      );
      const zielIndex = ohneGezogeneSpalte.indexOf(ziel);
      const naechsteReihenfolge = [...ohneGezogeneSpalte];

      naechsteReihenfolge.splice(
        Math.max(0, zielIndex),
        0,
        gezogeneSpalte,
      );

      window.localStorage.setItem(
        REIHENFOLGE_SPEICHER,
        JSON.stringify(naechsteReihenfolge),
      );

      return naechsteReihenfolge;
    });
  }

  function spaltenSichtbarkeitAendern(spalte: SpaltenId) {
    setAusgeblendeteSpalten((aktuell) => {
      const istAusgeblendet = aktuell.includes(spalte);

      if (!istAusgeblendet && sichtbareSpalten.length <= 1) {
        return aktuell;
      }

      const naechsteAuswahl = istAusgeblendet
        ? aktuell.filter((id) => id !== spalte)
        : [...aktuell, spalte];

      window.localStorage.setItem(
        SICHTBARKEIT_SPEICHER,
        JSON.stringify(naechsteAuswahl),
      );

      return naechsteAuswahl;
    });
  }

  function spalteSortieren(spalte: SpaltenId) {
    setSortierung((aktuell) => {
      const naechsteSortierung: Sortierung = {
        spalte,
        richtung:
          aktuell?.spalte === spalte &&
          aktuell.richtung === "aufsteigend"
            ? "absteigend"
            : "aufsteigend",
      };

      window.localStorage.setItem(
        SORTIERUNG_SPEICHER,
        JSON.stringify(naechsteSortierung),
      );

      return naechsteSortierung;
    });
  }

  function ansichtZuruecksetzen() {
    const standardReihenfolge = SPALTEN.map((spalte) => spalte.id);

    setSpaltenbreiten(STANDARD_SPALTENBREITEN);
    setSpaltenReihenfolge(standardReihenfolge);
    setAusgeblendeteSpalten([]);
    setSortierung(null);
    setSpaltenmenueOffen(false);

    window.localStorage.removeItem(SPALTEN_SPEICHER);
    window.localStorage.removeItem(REIHENFOLGE_SPEICHER);
    window.localStorage.removeItem(SICHTBARKEIT_SPEICHER);
    window.localStorage.removeItem(SORTIERUNG_SPEICHER);
  }

  function detailOeffnen(eintrag: DatenbankArtikel) {
    setDetailArtikel(eintrag);
    setBearbeitungsfehler(null);
    setBearbeitung({
      produktname: eintrag.produktname,
      suchbegriff: eintrag.suchbegriff ?? "",
      groesse: eintrag.groesse ?? "",
      variante: eintrag.variante ?? "",
      bestand: String(eintrag.bestand),
      reserviert: String(eintrag.reserviert),
      bestellt: String(eintrag.bestellt),
      inAuftrag: String(eintrag.inAuftrag),
      mindestbestand: String(eintrag.mindestbestand),
    });
  }

  async function aenderungenSpeichern(ids: number[]) {
    try {
      setSpeichert(true);
      setBearbeitungsfehler(null);
      const antwort = await fetch("/api/artikel", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids, ...bearbeitung }),
      });
      const daten = await antwort.json();

      if (!antwort.ok) {
        throw new Error(daten.fehler ?? "Änderungen konnten nicht gespeichert werden.");
      }

      setDetailArtikel(null);
      setAusgewaehlteIds([]);
      await onAktualisieren();
    } catch (error) {
      setBearbeitungsfehler(
        error instanceof Error ? error.message : "Speichern fehlgeschlagen.",
      );
    } finally {
      setSpeichert(false);
    }
  }

  return (
    <>
    <section className="mt-8 overflow-hidden rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)]">
      <div className="flex flex-col gap-4 border-b border-[var(--nova-rand)] p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--nova-text)]">
            Artikelbestand
          </h2>

          <p className="mt-1 text-sm text-[var(--nova-text-schwaecher)]">
            {gefilterteArtikel.length.toLocaleString(
              "de-DE",
            )}{" "}
            von{" "}
            {artikel.length.toLocaleString("de-DE")}{" "}
            Artikeln
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
          <div className="w-full md:w-96">
            <label
              htmlFor="bestand-suche"
              className="sr-only"
            >
              Bestand durchsuchen
            </label>

            <input
              id="bestand-suche"
              type="search"
              value={suche}
              onChange={sucheAendern}
              placeholder="Artikelnummer, Produkt oder Suchbegriff..."
              className="w-full rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-4 py-3 text-sm text-[var(--nova-text)] outline-none transition placeholder:text-[var(--nova-text-schwaecher)] focus:border-[var(--nova-akzent)]"
            />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setFiltermenueOffen((offen) => !offen)}
              className="w-full whitespace-nowrap rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-4 py-3 text-sm font-medium text-[var(--nova-text)] transition hover:border-[var(--nova-akzent)] sm:w-auto"
            >
              Filter{aktiveFilter > 0 ? ` (${aktiveFilter})` : ""}
            </button>

            {filtermenueOffen && (
              <div className="absolute right-0 z-40 mt-2 w-80 space-y-4 rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-4 shadow-2xl">
                <FilterAuswahl
                  label="Bestandsstatus"
                  wert={bestandsstatus}
                  onChange={setBestandsstatus}
                  optionen={[
                    ["alle", "Alle Bestände"],
                    ["verfuegbar", "Verfügbar"],
                    ["kritisch", "Unter Mindestbestand"],
                    ["leer", "Kein Bestand"],
                  ]}
                />

                <FilterAuswahl
                  label="Größe"
                  wert={groessenfilter}
                  onChange={setGroessenfilter}
                  optionen={[
                    ["alle", "Alle Größen"],
                    ...groessen.map((wert) => [wert, wert] as [string, string]),
                  ]}
                />

                <FilterAuswahl
                  label="Variante"
                  wert={variantenfilter}
                  onChange={setVariantenfilter}
                  optionen={[
                    ["alle", "Alle Varianten"],
                    ...varianten.map((wert) => [wert, wert] as [string, string]),
                  ]}
                />

                <button
                  type="button"
                  onClick={() => {
                    setBestandsstatus("alle");
                    setGroessenfilter("alle");
                    setVariantenfilter("alle");
                  }}
                  className="w-full rounded-lg border border-[var(--nova-rand)] px-3 py-2 text-sm text-[var(--nova-text)] transition hover:border-[var(--nova-akzent)] hover:bg-[var(--nova-flaeche-hover)]"
                >
                  Filter zurücksetzen
                </button>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setSpaltenmenueOffen((offen) => !offen)
              }
              className="w-full whitespace-nowrap rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-4 py-3 text-sm font-medium text-[var(--nova-text)] transition hover:border-[var(--nova-akzent)] sm:w-auto"
            >
              Spalten anpassen
            </button>

            {spaltenmenueOffen && (
              <div className="absolute right-0 z-30 mt-2 w-72 rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] p-3 shadow-2xl">
                <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-[var(--nova-text-schwaecher)]">
                  Sichtbare Spalten
                </p>

                <div className="max-h-80 space-y-1 overflow-y-auto">
                  {SPALTEN.map((spalte) => {
                    const sichtbar =
                      !ausgeblendeteSpalten.includes(spalte.id);

                    return (
                      <label
                        key={spalte.id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-[var(--nova-text)] hover:bg-[var(--nova-flaeche-hover)]"
                      >
                        <input
                          type="checkbox"
                          checked={sichtbar}
                          onChange={() =>
                            spaltenSichtbarkeitAendern(spalte.id)
                          }
                          className="h-4 w-4 accent-[var(--nova-akzent)]"
                        />
                        {spalte.titel}
                      </label>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={ansichtZuruecksetzen}
                  className="mt-3 w-full rounded-lg border border-[var(--nova-rand)] px-3 py-2 text-sm text-[var(--nova-text)] transition hover:border-[var(--nova-akzent)] hover:bg-[var(--nova-flaeche-hover)]"
                >
                  Ansicht zurücksetzen
                </button>
              </div>
            )}
          </div>
        </div>

        {istAdmin && ausgewaehlteIds.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setDetailArtikel(null);
              setBearbeitungsfehler(null);
              setBearbeitung({ mindestbestand: "0" });
            }}
            className="rounded-xl bg-[var(--nova-akzent)] px-4 py-3 text-sm font-semibold text-white"
          >
            {ausgewaehlteIds.length} Artikel bearbeiten
          </button>
        )}
      </div>

      <div
        className="max-h-[70vh] overflow-auto"
        onScroll={tabelleScrollen}
      >
        <table
          className="table-fixed border-collapse text-left text-sm"
          style={{ width: tabellenbreite + (istAdmin ? 52 : 0) }}
        >
          <colgroup>
            {istAdmin && <col style={{ width: 52 }} />}
            {sichtbareSpalten.map((spalte) => (
              <col
                key={spalte.id}
                style={{ width: spaltenbreiten[spalte.id] }}
              />
            ))}
          </colgroup>

          <thead className="bg-[var(--nova-hintergrund)] text-xs uppercase tracking-wide text-[var(--nova-text-schwaecher)]">
            <tr>
              {istAdmin && (
                <th className="sticky top-0 z-20 bg-[var(--nova-hintergrund)] px-4 py-4">
                  <input
                    type="checkbox"
                    checked={
                      sichtbareArtikel.length > 0 &&
                      sichtbareArtikel.every((eintrag) =>
                        ausgewaehlteIds.includes(eintrag.id),
                      )
                    }
                    onChange={(event) =>
                      setAusgewaehlteIds(
                        event.target.checked
                          ? sichtbareArtikel.map((eintrag) => eintrag.id)
                          : [],
                      )
                    }
                    aria-label="Alle sichtbaren Artikel auswählen"
                  />
                </th>
              )}
              {sichtbareSpalten.map((spalte) => (
                <th
                  key={spalte.id}
                  draggable
                  onDragStart={() => setGezogeneSpalte(spalte.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => spalteVerschieben(spalte.id)}
                  onDragEnd={() => setGezogeneSpalte(null)}
                  className={`sticky top-0 z-20 bg-[var(--nova-hintergrund)] relative overflow-hidden px-5 py-4 ${
                    "rechts" in spalte && spalte.rechts
                      ? "text-right"
                      : ""
                  } ${
                    gezogeneSpalte === spalte.id
                      ? "opacity-40"
                      : "cursor-grab active:cursor-grabbing"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => spalteSortieren(spalte.id)}
                    className={`flex w-full items-center gap-1 truncate ${
                      "rechts" in spalte && spalte.rechts
                        ? "justify-end"
                        : "justify-start"
                    }`}
                    title={`${spalte.titel} sortieren`}
                  >
                    <span className="truncate">{spalte.titel}</span>

                    {sortierung?.spalte === spalte.id && (
                      <span aria-hidden="true">
                        {sortierung.richtung === "aufsteigend"
                          ? "↑"
                          : "↓"}
                      </span>
                    )}
                  </button>

                  <div
                    role="separator"
                    aria-label={`${spalte.titel} verbreitern oder verkleinern`}
                    onMouseDown={(event) =>
                      spaltenbreiteAendern(spalte.id, event)
                    }
                    className="absolute right-0 top-0 h-full w-2 cursor-col-resize border-r border-transparent transition hover:border-[var(--nova-akzent)]"
                  />
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {sichtbareArtikel.map((eintrag) => (
                <tr
                  key={eintrag.id}
                  onClick={() => detailOeffnen(eintrag)}
                className="cursor-pointer border-t border-[var(--nova-rand)] transition-colors duration-150 hover:!bg-[var(--nova-hover)] [&:hover>td]:!bg-[var(--nova-hover)]"
                >
                  {istAdmin && (
                    <td className="px-4 py-4" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={ausgewaehlteIds.includes(eintrag.id)}
                        onChange={(event) =>
                          setAusgewaehlteIds((aktuell) =>
                            event.target.checked
                              ? [...aktuell, eintrag.id]
                              : aktuell.filter((id) => id !== eintrag.id),
                          )
                        }
                        aria-label={`${eintrag.artikelnummer} auswählen`}
                      />
                    </td>
                  )}
                  {sichtbareSpalten.map((spalte) => (
                    <ArtikelZelle
                      key={spalte.id}
                      spalte={spalte.id}
                      eintrag={eintrag}
                    />
                  ))}
                </tr>
              ))}

            {sichtbareArtikel.length === 0 && (
              <tr>
                <td
                  colSpan={sichtbareSpalten.length + (istAdmin ? 1 : 0)}
                  className="px-5 py-16 text-center text-[var(--nova-text-schwaecher)]"
                >
                  Keine passenden Artikel gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-4 border-t border-[var(--nova-rand)] px-5 py-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-[var(--nova-text-schwaecher)]">
          {sichtbareArtikel.length.toLocaleString("de-DE")} von{" "}
          {gefilterteArtikel.length.toLocaleString("de-DE")} Artikeln
        </p>

        <span className="text-sm text-[var(--nova-text-schwaecher)]">
          {weitereArtikelVorhanden
            ? "Weitere Artikel werden beim Scrollen geladen."
            : "Alle Artikel wurden geladen."}
        </span>
      </div>
    </section>

    {(detailArtikel || (istAdmin && ausgewaehlteIds.length > 0 && Object.keys(bearbeitung).length === 1)) && (
      <ArtikelDialog
        artikel={detailArtikel}
        istAdmin={istAdmin}
        mehrfachAnzahl={detailArtikel ? 0 : ausgewaehlteIds.length}
        werte={bearbeitung}
        fehler={bearbeitungsfehler}
        speichert={speichert}
        onWert={(feld, wert) =>
          setBearbeitung((aktuell) => ({ ...aktuell, [feld]: wert }))
        }
        onSchliessen={() => {
          setDetailArtikel(null);
          setBearbeitung({});
          setBearbeitungsfehler(null);
        }}
        onSpeichern={() =>
          void aenderungenSpeichern(
            detailArtikel ? [detailArtikel.id] : ausgewaehlteIds,
          )
        }
      />
    )}
    </>
  );
}

function FilterAuswahl({
  label,
  wert,
  optionen,
  onChange,
}: {
  label: string;
  wert: string;
  optionen: [string, string][];
  onChange: (wert: string) => void;
}) {
  return (
    <label className="block text-sm text-[var(--nova-text)]">
      <span className="mb-2 block font-medium">{label}</span>
      <select
        value={wert}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-3 py-2.5 text-[var(--nova-text)] outline-none focus:border-[var(--nova-akzent)]"
      >
        {optionen.map(([optionWert, titel]) => (
          <option key={optionWert} value={optionWert}>
            {titel}
          </option>
        ))}
      </select>
    </label>
  );
}

function ArtikelDialog({
  artikel,
  istAdmin,
  mehrfachAnzahl,
  werte,
  fehler,
  speichert,
  onWert,
  onSchliessen,
  onSpeichern,
}: {
  artikel: DatenbankArtikel | null;
  istAdmin: boolean;
  mehrfachAnzahl: number;
  werte: Record<string, string>;
  fehler: string | null;
  speichert: boolean;
  onWert: (feld: string, wert: string) => void;
  onSchliessen: () => void;
  onSpeichern: () => void;
}) {
  type TraegerDaten = {
    lagerplatz: { code: string; bezeichnung: string } | null;
    gesamtmenge: number;
    ladungstraegerGesamt: number;
    ladungstraeger: { barcode: string; menge: number }[];
  };
  const [traegerDaten, setTraegerDaten] = useState<TraegerDaten | null>(null);
  const [traegerFehler, setTraegerFehler] = useState("");
  const [traegerLaedt, setTraegerLaedt] = useState(false);

  useEffect(() => {
    if (!artikel) {
      setTraegerDaten(null);
      return;
    }

    let aktiv = true;
    setTraegerLaedt(true);
    setTraegerFehler("");
    fetch(`/api/lager/ladungstraeger?artikelId=${artikel.id}`, { cache: "no-store" })
      .then(async (antwort) => {
        const daten = await antwort.json();
        if (!antwort.ok) throw new Error(daten.fehler || "Ladungsträger konnten nicht geladen werden.");
        if (aktiv) setTraegerDaten(daten);
      })
      .catch((error) => {
        if (aktiv) setTraegerFehler(error instanceof Error ? error.message : "Ladungsträger konnten nicht geladen werden.");
      })
      .finally(() => {
        if (aktiv) setTraegerLaedt(false);
      });

    return () => {
      aktiv = false;
    };
  }, [artikel]);

  const mehrfach = mehrfachAnzahl > 0;
  const felder = mehrfach
    ? [["mindestbestand", "Mindestbestand"]]
    : [
        ["produktname", "Produktname"],
        ["suchbegriff", "Suchbegriff"],
        ["groesse", "Größe"],
        ["variante", "Variante"],
        ["bestand", "Bestand"],
        ["reserviert", "Reserviert"],
        ["bestellt", "Bestellt"],
        ["inAuftrag", "In Auftrag"],
        ["mindestbestand", "Mindestbestand"],
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] shadow-2xl">
        <div className="flex items-start justify-between border-b border-[var(--nova-rand)] px-6 py-5">
          <div>
            <h2 className="text-2xl font-bold text-[var(--nova-text)]">
              {mehrfach ? `${mehrfachAnzahl} Artikel bearbeiten` : "Artikeldetails"}
            </h2>
            <p className="mt-1 text-sm text-[var(--nova-text-schwaecher)]">
              {mehrfach
                ? "Der Mindestbestand wird für alle ausgewählten Artikel gesetzt."
                : artikel?.artikelnummer}
            </p>
          </div>
          <button
            type="button"
            onClick={onSchliessen}
            className="rounded-lg px-3 py-2 text-xl text-[var(--nova-text-schwaecher)] hover:bg-[var(--nova-flaeche-hover)]"
            aria-label="Dialog schließen"
          >
            ×
          </button>
        </div>

        <div className="grid gap-5 p-6 md:grid-cols-2">
          {felder.map(([feld, label]) => (
            <label key={feld} className="block text-sm text-[var(--nova-text)]">
              <span className="mb-2 block font-medium">{label}</span>
              <input
                value={werte[feld] ?? ""}
                onChange={(event) => onWert(feld, event.target.value)}
                readOnly={!istAdmin}
                type={
                  ["bestand", "reserviert", "bestellt", "inAuftrag", "mindestbestand"].includes(feld)
                    ? "number"
                    : "text"
                }
                step="any"
                className="w-full rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] px-4 py-3 text-[var(--nova-text)] outline-none focus:border-[var(--nova-akzent)] read-only:opacity-70"
              />
            </label>
          ))}

          {!mehrfach && artikel && (
            <div className="rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)] p-4 text-sm text-[var(--nova-text)]">
              <span className="text-[var(--nova-text-schwaecher)]">Verfügbar</span>
              <p className="mt-1 text-lg font-semibold">{zahlFormatieren(artikel.verfuegbar)}</p>
            </div>
          )}
        </div>

        {!mehrfach && artikel && (
          <section className="mx-6 mb-6 overflow-hidden rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--nova-rand)] px-4 py-3">
              <div>
                <h3 className="font-semibold text-[var(--nova-text)]">Ladungsträger</h3>
                <p className="text-xs text-[var(--nova-text-schwaecher)]">
                  Maximal 50 Stück je Träger · mit MDE scanbar
                </p>
              </div>
              {traegerDaten && (
                <div className="text-right text-sm">
                  <b className="text-[var(--nova-akzent)]">{traegerDaten.ladungstraegerGesamt} Träger</b>
                  <p className="text-xs text-[var(--nova-text-schwaecher)]">
                    {zahlFormatieren(traegerDaten.gesamtmenge)} Stk. · {traegerDaten.lagerplatz?.code ?? "Kein Lagerplatz"}
                  </p>
                </div>
              )}
            </div>
            {traegerLaedt && <p className="p-4 text-sm text-[var(--nova-text-schwaecher)]">Ladungsträger werden geladen …</p>}
            {traegerFehler && <p className="p-4 text-sm text-red-400">{traegerFehler}</p>}
            {traegerDaten && (
              <div className="max-h-56 overflow-y-auto p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  {traegerDaten.ladungstraeger.map((traeger) => (
                    <div key={traeger.barcode} className="flex items-center justify-between rounded-lg border border-[var(--nova-rand)] bg-[var(--nova-flaeche)] px-3 py-2 text-sm">
                      <code className="text-[var(--nova-akzent)]">{traeger.barcode}</code>
                      <b>{zahlFormatieren(traeger.menge)} Stk.</b>
                    </div>
                  ))}
                </div>
                {traegerDaten.ladungstraeger.length === 0 && (
                  <p className="p-3 text-center text-sm text-[var(--nova-text-schwaecher)]">Für diesen Artikel ist kein physischer Bestand vorhanden.</p>
                )}
              </div>
            )}
          </section>
        )}

        {fehler && <p className="mx-6 mb-4 rounded-xl bg-red-950/50 p-3 text-sm text-red-300">{fehler}</p>}

        <div className="flex justify-end gap-3 border-t border-[var(--nova-rand)] px-6 py-5">
          <button
            type="button"
            onClick={onSchliessen}
            className="rounded-xl border border-[var(--nova-rand)] px-5 py-3 text-sm text-[var(--nova-text)]"
          >
            Schließen
          </button>
          {istAdmin && (
            <button
              type="button"
              onClick={onSpeichern}
              disabled={speichert}
              className="rounded-xl bg-[var(--nova-akzent)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {speichert ? "Speichert..." : "Änderungen speichern"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
