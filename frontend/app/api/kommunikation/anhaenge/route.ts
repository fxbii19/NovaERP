import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { aktuellerBenutzer } from "@/lib/auth-server";

export const runtime = "nodejs";
const MAX_GROESSE = 10 * 1024 * 1024;
const ERLAUBT = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export async function POST(request: NextRequest) {
  if (!(await aktuellerBenutzer()))
    return NextResponse.json(
      { fehler: "Bitte erneut anmelden." },
      { status: 401 },
    );
  const formular = await request.formData();
  const dateien = formular
    .getAll("dateien")
    .filter((wert): wert is File => wert instanceof File);
  if (!dateien.length || dateien.length > 5)
    return NextResponse.json(
      { fehler: "Bitte 1 bis 5 Dateien auswählen." },
      { status: 400 },
    );
  const ziel = path.join(process.cwd(), "public", "uploads", "mail");
  await mkdir(ziel, { recursive: true });
  const anhaenge = [];
  for (const datei of dateien) {
    if (datei.size > MAX_GROESSE)
      return NextResponse.json(
        { fehler: `${datei.name} ist größer als 10 MB.` },
        { status: 400 },
      );
    if (!ERLAUBT.has(datei.type))
      return NextResponse.json(
        { fehler: `${datei.name} hat einen nicht erlaubten Dateityp.` },
        { status: 400 },
      );
    const endung = path
      .extname(datei.name)
      .toLowerCase()
      .replace(/[^.a-z0-9]/g, "");
    const dateiname = `${Date.now()}-${crypto.randomUUID()}${endung}`;
    await writeFile(
      path.join(ziel, dateiname),
      Buffer.from(await datei.arrayBuffer()),
    );
    anhaenge.push({
      name: datei.name,
      url: `/uploads/mail/${dateiname}`,
      typ: datei.type,
      groesse: datei.size,
    });
  }
  return NextResponse.json({ anhaenge });
}
