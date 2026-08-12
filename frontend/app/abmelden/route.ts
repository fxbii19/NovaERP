import { NextRequest, NextResponse } from "next/server";
import { sitzungLoeschen } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  await sitzungLoeschen();

  const feierabend = request.nextUrl.searchParams.get("ziel") === "beendet";
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "localhost:3000";
  const protokoll = request.headers.get("x-forwarded-proto") || "http";
  const ziel = new URL(
    feierabend ? "/beendet" : "/login",
    `${protokoll}://${host}`,
  );

  return NextResponse.redirect(ziel);
}
