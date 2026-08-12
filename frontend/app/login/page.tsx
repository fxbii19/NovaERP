"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [nachname, setNachname] = useState("");
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState("");
  const [laedt, setLaedt] = useState(false);

  const [updateInfo, setUpdateInfo] = useState<{
    status: string;
    neueVersion?: string;
  } | null>(null);

  useEffect(() => {
    if (!window.novaDesktop) return;

    return window.novaDesktop.updateStatusEmpfangen((status) => {
      setUpdateInfo(status);
    });
  }, []);

  async function anmelden(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFehler("");
    setLaedt(true);

    try {
      const antwort = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nachname,
          passwort,
        }),
      });

      const daten = (await antwort.json()) as {
        fehler?: string;
      };

      if (!antwort.ok) {
        setFehler(
          daten.fehler ?? "Die Anmeldung ist fehlgeschlagen."
        );
        return;
      }

      localStorage.removeItem("nova-user");
      localStorage.removeItem("nova-benutzer");

      const weiter = new URLSearchParams(
        window.location.search
      ).get("weiter");

      router.replace(
        weiter?.startsWith("/") ? weiter : "/"
      );

      router.refresh();
    } catch {
      setFehler(
        "Der NOVA-Server ist momentan nicht erreichbar."
      );
    } finally {
      setLaedt(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f6fb] text-[#172033]">
      <div className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <section className="relative flex w-full max-w-[470px] items-center justify-center">

          <div className="absolute -top-24 left-1/2 flex -translate-x-1/2 items-center gap-3">
            <Image
              src="/branding/nova-mark.png"
              alt="NOVA"
              width={48}
              height={48}
              priority
              className="h-11 w-11 object-contain"
            />

            <span className="font-bold">
              NOVA ERP
            </span>
          </div>

          <div className="w-full rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-300/25 sm:p-10">
            <div className="mb-9">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <LockKeyhole className="h-6 w-6" />
              </div>

              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
                Willkommen zurück
              </p>

              <h2 className="text-3xl font-bold tracking-tight text-[#172033] sm:text-4xl">
                Bei NOVA anmelden
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Melde dich mit deinem persönlichen NOVA-Zugang an.
              </p>
            </div>

            <form
              onSubmit={anmelden}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="nachname"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Nachname
                </label>

                <input
                  id="nachname"
                  value={nachname}
                  onChange={(event) =>
                    setNachname(event.target.value)
                  }
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-[15px] text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  placeholder="Nachname eingeben"
                  autoComplete="username"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="passwort"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Passwort
                </label>

                <input
                  id="passwort"
                  type="password"
                  value={passwort}
                  onChange={(event) =>
                    setPasswort(event.target.value)
                  }
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-[15px] text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  placeholder="Passwort eingeben"
                  autoComplete="current-password"
                  required
                />
              </div>

              {fehler && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {fehler}
                </div>
              )}

              <button
                type="submit"
                disabled={laedt}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {laedt
                  ? "Anmeldung wird geprüft ..."
                  : "Sicher anmelden"}

                {!laedt && (
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                )}
              </button>
            </form>
          </div>

          {updateInfo?.status === "verfuegbar" && (
            <div className="absolute -bottom-24 left-1/2 w-full max-w-[470px] -translate-x-1/2 rounded-2xl border border-indigo-200 bg-white px-4 py-3 shadow-lg">
              <p className="text-sm font-semibold text-indigo-700">
                Update {updateInfo.neueVersion} verfügbar
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Melde dich an, um das Update herunterzuladen und zu installieren.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}