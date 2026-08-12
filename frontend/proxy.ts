import { NextRequest, NextResponse } from "next/server";

const SITZUNGS_COOKIE = "nova-sitzung";

function zielUrl(request: NextRequest, pfad: string) {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "localhost:3000";
  const protokoll = request.headers.get("x-forwarded-proto") || "http";

  return new URL(pfad, `${protokoll}://${host}`);
}

export function proxy(request: NextRequest) {
  const pfad = request.nextUrl.pathname;
  const hatSitzung = Boolean(request.cookies.get(SITZUNGS_COOKIE)?.value);
  const istOeffentlicheSeite = pfad === "/login" || pfad === "/beendet";

  if (pfad === "/login" && hatSitzung) {
    return NextResponse.redirect(zielUrl(request, "/"));
  }
  if (!istOeffentlicheSeite && !hatSitzung) {
    const login = zielUrl(request, "/login");
    login.searchParams.set("weiter", pfad);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
