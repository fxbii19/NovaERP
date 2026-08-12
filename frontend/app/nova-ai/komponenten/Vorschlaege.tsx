type VorschlaegeProps = {
  onAuswaehlen: (text: string) => void;
};

const vorschlaege = [
  "Zeige mir offene Bestellungen.",
  "Prüfe den aktuellen Bestand.",
  "Welche QS-Probleme gibt es?",
  "Analysiere das Dashboard.",
];

export default function Vorschlaege({
  onAuswaehlen,
}: VorschlaegeProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {vorschlaege.map((vorschlag) => (
        <button
          key={vorschlag}
          onClick={() => onAuswaehlen(vorschlag)}
          className="rounded-xl border border-[var(--nova-rand)] bg-[var(--nova-hintergrund)]/40 p-4 text-left transition hover:bg-[var(--nova-flaeche-hover)]"
        >
          {vorschlag}
        </button>
      ))}
    </div>
  );
}