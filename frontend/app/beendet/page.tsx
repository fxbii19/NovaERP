"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function BeendetPage() {
  const [vorname, setVorname] = useState("");
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    setVorname(sessionStorage.getItem("nova-abschied-name") ?? "");
    sessionStorage.removeItem("nova-abschied-name");

    const istDesktop = window.novaDesktop?.aktiv === true;
    setDesktop(istDesktop);

    if (!istDesktop) return;

    const schliessen = window.setTimeout(() => {
      window.novaDesktop?.schliessen();
    }, 5000);

    return () => {
      window.clearTimeout(schliessen);
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center shadow-2xl">
        <div className="mb-6 text-6xl" aria-hidden="true">
          👋
        </div>

        <h1 className="text-3xl font-bold">
          Schönen Feierabend{vorname ? `, ${vorname}` : ""}!
        </h1>

        <p className="mt-4 text-slate-300">
          NOVA wurde sicher beendet und du wurdest erfolgreich abgemeldet.
        </p>

        <p className="mt-3 text-sm text-slate-500">Bis zum nächsten Mal.</p>

        {desktop ? (
          <div className="mt-8">
            <p className="text-sm font-medium text-cyan-400">
              NOVA wird geschlossen …
            </p>
            <div className="mx-auto mt-4 h-1.5 w-48 overflow-hidden rounded-full bg-slate-800">
              <div className="nova-feierabend-balken h-full rounded-full bg-cyan-500" />
            </div>
          </div>
        ) : (
          <Link
            href="/login"
            className="mt-8 inline-flex rounded-xl bg-cyan-600 px-6 py-3 font-medium transition hover:bg-cyan-500"
          >
            Jetzt erneut anmelden
          </Link>
        )}
      </div>
      <style jsx>{`
        .nova-feierabend-balken {
          width: 100%;
          transform-origin: left;
          animation: nova-feierabend 5s linear forwards;
        }

        @keyframes nova-feierabend {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }
      `}</style>
    </main>
  );
}
