export function produktnameOhneVariante(
  produktname: unknown,
  variante: unknown,
): string {
  const name = String(produktname ?? "").trim();
  const varianteText = String(variante ?? "").trim();

  if (!name || !varianteText) return name;

  const nameKlein = name.toLocaleLowerCase("de-DE");
  const varianteKlein = varianteText.toLocaleLowerCase("de-DE");

  for (const trenner of [" – ", " — ", " - "]) {
    const endung = `${trenner}${varianteKlein}`;
    if (nameKlein.endsWith(endung)) {
      return name.slice(0, name.length - endung.length).trim();
    }
  }

  return name;
}
