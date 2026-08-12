import { NextRequest, NextResponse } from "next/server";
import { administratorAnfordern } from "@/lib/auth-server";
import { smtpKonfiguriert, smtpPruefen } from "@/lib/integrationen/smtp";

export async function GET() {
  if (!await administratorAnfordern()) return NextResponse.json({ fehler: "Nur für Administratoren." }, { status: 403 });
  return NextResponse.json({ smtp: { status: smtpKonfiguriert() ? "KONFIGURIERT" : "TESTMODUS", host: process.env.SMTP_HOST || "Nicht hinterlegt" }, restApi: { status: process.env.NOVA_EXTERNAL_API_KEY ? "AKTIV" : "NICHT KONFIGURIERT", endpunkt: "/api/external/v1/artikel" }, scanner: { status: "BEREIT", modi: ["Kamera", "QR-Code", "USB-/Bluetooth-Handscanner"] }, drucker: { status: "BROWSERDRUCK", hinweis: "Systemdrucker werden über den Betriebssystem-Dialog verwendet." }, erp: { status: "BEREIT", formate: ["REST/JSON", "Excel/XLSX", "CSV"] } });
}

export async function POST(request: NextRequest) {
  if (!await administratorAnfordern()) return NextResponse.json({ fehler: "Nur für Administratoren." }, { status: 403 });
  const { aktion } = await request.json();
  if (aktion === "smtp-test") {
    if (!smtpKonfiguriert()) return NextResponse.json({ fehler: "SMTP-Zugangsdaten sind noch nicht in .env.local hinterlegt." }, { status: 400 });
    try { await smtpPruefen(); return NextResponse.json({ meldung: "Verbindung zum E-Mail-Server erfolgreich." }); } catch { return NextResponse.json({ fehler: "Der E-Mail-Server konnte nicht erreicht werden." }, { status: 502 }); }
  }
  return NextResponse.json({ fehler: "Unbekannte Aktion." }, { status: 400 });
}
