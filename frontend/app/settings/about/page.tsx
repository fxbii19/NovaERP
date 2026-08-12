"use client";

import {
  Bot,
  Code2,
  Info,
  Rocket,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { novaVersion } from "@/lib/nova-version";
import { useEffect, useState } from "react";

export default function AboutNovaPage() {
  const [version, setVersion] = useState("...");

  useEffect(() => {
    void novaVersion().then(setVersion);
  }, []);

  const technologies = [
    "Next.js",
    "TypeScript",
    "Tailwind CSS",
    "Prisma",
    "PostgreSQL",
    "Lucide",
  ];

  return (
    <main className="min-h-screen bg-background px-6 py-8 text-foreground lg:px-10 xl:px-14">
      <div className="mx-auto w-full max-w-[1500px] space-y-6">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-sm lg:p-10">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />

          <div className="relative flex flex-col items-center text-center">
            

            <span className="mb-4 inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-400">
              Active Development
            </span>

            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              NOVA ERP
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              Moderne Unternehmenssoftware für effiziente, transparente und
              intelligent gesteuerte Arbeitsprozesse.
            </p>

            <p className="mt-4 text-sm font-semibold text-primary md:text-base">
              Weniger warten. Mehr arbeiten.
            </p>

            <div className="mt-7 grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-background/70 px-4 py-3 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Version
                </p>
                <p className="mt-1 font-semibold">{version}</p>
              </div>

              <div className="rounded-xl border border-border bg-background/70 px-4 py-3 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Status
                </p>
                <p className="mt-1 font-semibold">In Entwicklung</p>
              </div>
            </div>
          </div>
        </section>

        {/* Über NOVA + Entwicklung */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Info className="h-5 w-5 text-primary" />
              </div>

              <h2 className="text-xl font-semibold">Über NOVA</h2>
            </div>

            <p className="leading-7 text-muted-foreground">
              NOVA ist eine moderne ERP-Plattform, die entwickelt wurde, um
              Unternehmensprozesse effizienter, übersichtlicher und einfacher
              zu gestalten.
            </p>

            <p className="mt-4 leading-7 text-muted-foreground">
              Von Wareneingang und Einkauf über Lagerverwaltung und
              Qualitätssicherung bis hin zu Versand und Administration vereint
              NOVA zentrale Arbeitsbereiche in einer gemeinsamen Plattform.
            </p>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>

              <h2 className="text-xl font-semibold">Entwicklung</h2>
            </div>

            <div className="rounded-xl border border-border bg-background p-5">
              <p className="text-lg font-semibold">Fabian Weinhold</p>

              <p className="mt-1 text-sm font-medium text-primary">
                Founder · Product Lead · Lead Developer
              </p>

              <p className="mt-4 leading-7 text-muted-foreground">
                Verantwortlich für die Produktvision, Entwicklung,
                Systemarchitektur, Benutzeroberfläche und die langfristige
                Weiterentwicklung von NOVA.
              </p>
            </div>
          </section>
        </div>

        {/* NOVA AI + Technologien */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>

              <div>
                <h2 className="text-xl font-semibold">NOVA AI</h2>
                <p className="text-sm text-muted-foreground">
                  Intelligente Unterstützung direkt im ERP
                </p>
              </div>
            </div>

            <p className="leading-7 text-muted-foreground">
              NOVA AI soll Mitarbeiter dabei unterstützen, Fehler schneller zu
              verstehen, Prozesse nachzuvollziehen und passende Lösungen zu
              finden.
            </p>

            <p className="mt-4 leading-7 text-muted-foreground">
              Der Assistent wird schrittweise in die verschiedenen Bereiche von
              NOVA integriert.
            </p>

            <div className="mt-5">
              <span className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-500">
                In Entwicklung
              </span>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Code2 className="h-5 w-5 text-primary" />
              </div>

              <h2 className="text-xl font-semibold">Technologien</h2>
            </div>

            <p className="mb-5 leading-7 text-muted-foreground">
              NOVA basiert auf modernen und bewährten Technologien.
            </p>

            <div className="flex flex-wrap gap-3">
              {technologies.map((technology) => (
                <span
                  key={technology}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium"
                >
                  {technology}
                </span>
              ))}
            </div>
          </section>
        </div>

        {/* Werte */}
        <section className="grid gap-6 md:grid-cols-3">
          <article className="rounded-2xl border border-border bg-card p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-primary/40">
            <Sparkles className="mb-4 h-6 w-6 text-primary" />

            <h3 className="text-lg font-semibold">Modern</h3>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Klare Strukturen, eine intuitive Oberfläche und moderne
              Technologien.
            </p>
          </article>

          <article className="rounded-2xl border border-border bg-card p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-primary/40">
            <Rocket className="mb-4 h-6 w-6 text-primary" />

            <h3 className="text-lg font-semibold">Effizient</h3>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Weniger unnötige Schritte und schnellere Abläufe im Arbeitsalltag.
            </p>
          </article>

          <article className="rounded-2xl border border-border bg-card p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-primary/40">
            <ShieldCheck className="mb-4 h-6 w-6 text-primary" />

            <h3 className="text-lg font-semibold">Zuverlässig</h3>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Sichere Prozesse, klare Berechtigungen und nachvollziehbare
              Systemzustände.
            </p>
          </article>
        </section>

        {/* Footer */}
        <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
          <p>© 2026 NOVA ERP</p>
          <p className="mt-1">Weniger warten. Mehr arbeiten.</p>
        </footer>
      </div>
    </main>
  );
}
