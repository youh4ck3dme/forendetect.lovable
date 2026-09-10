import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Network, Scale, ShieldCheck } from "lucide-react";
import malteMark from "@/assets/malte-mark.png";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/malte/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { isDevFreeEntryActive } from "@/lib/dev-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Forendo — forenzná analýza finančných tokov" },
      {
        name: "description",
        content:
          "Forendo pomáha vyšetrovateľom odhaliť schránkové firmy, pranie peňazí a cezhraničné toky v jednom prehľadnom prípade.",
      },
      {
        property: "og:title",
        content: "Forendo — forenzná analýza finančných tokov",
      },
      {
        property: "og:description",
        content:
          "Analýza. Dôkazy. Rozhodnutia. Forenzná platforma pre finančnú kriminalitu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: ShieldCheck,
    title: "Detektory rizika",
    detail:
      "Schránkové firmy, pranie peňazí, zbrane a časové vzorce v jednom skóre.",
  },
  {
    icon: Network,
    title: "Mapa vzťahov",
    detail: "Prepojenia medzi osobami, firmami a tokmi peňazí na prvý pohľad.",
  },
  {
    icon: Scale,
    title: "Právny kontext",
    detail: "Každá detekcia naviazaná na konkrétne ustanovenie predpisu.",
  },
];

function Landing() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    if (isDevFreeEntryActive()) {
      void navigate({ to: "/prehlad", replace: true });
      return;
    }
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!active) return;
        if (data.user) void navigate({ to: "/prehlad", replace: true });
        else setChecking(false);
      })
      .catch(() => active && setChecking(false));
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <main className="flex min-h-dvh flex-col overflow-x-hidden bg-background lg:h-dvh">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-between px-5 pt-3 sm:pt-5 pb-5 sm:pb-6 gap-5 sm:gap-6">
        <header className="flex items-center gap-2">
          <img
            src={malteMark}
            alt=""
            width={30}
            height={30}
            className="h-7 w-7"
            aria-hidden
          />
          <span className="text-lg font-extrabold tracking-tight">Forendo</span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Prihlásiť sa</Link>
            </Button>
          </div>
        </header>

        <section className="max-w-2xl space-y-3 sm:space-y-4 my-auto">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Forenzná analýza
          </p>
          <h1 className="text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Analýza. Dôkazy. Rozhodnutia.
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Forendo spája finančné toky, subjekty a zbrane do jedného prípadu a
            upozorní na to, čo si zaslúži pozornosť vyšetrovateľa.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button asChild size="lg">
              <Link to="/auth">
                Začať zadarmo{" "}
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
          {checking ? (
            <p className="text-caption">Overujeme prihlásenie…</p>
          ) : null}
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, detail }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-card p-4 sm:p-5"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                <Icon className="h-4.5 w-4.5" aria-hidden />
              </span>
              <h2 className="mt-2.5 text-sm font-semibold">{title}</h2>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {detail}
              </p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
