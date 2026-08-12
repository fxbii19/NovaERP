import { NextResponse } from "next/server";
import { aktuellerBenutzer, sitzungLoeschen } from "@/lib/auth-server";

export async function GET() {
  const benutzer = await aktuellerBenutzer();
  if (!benutzer) {
    return NextResponse.json({ fehler: "Nicht angemeldet." }, { status: 401 });
  }
  return NextResponse.json({ benutzer });
}

export async function DELETE() {
  await sitzungLoeschen();
  return NextResponse.json({ erfolg: true });
}
