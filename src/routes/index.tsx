import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Network, Scale, ShieldCheck } from "lucide-react";
import malteMark from "@/assets/malte-mark.png";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

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
    <main className="min-h-screen overflow-x-hidden bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-5 py-14">
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
          <div className="ml-auto">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Prihlásiť sa</Link>
            </Button>
          </div>
        </header>

        <section className="max-w-2xl space-y-5">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Forenzná analýza
          </p>
          <h1 className="text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl">
            Analýza. Dôkazy. Rozhodnutia.
          </h1>
          <p className="text-muted-foreground">
            Forendo spája finančné toky, subjekty a zbrane do jedného prípadu a
            upozorní na to, čo si zaslúži pozornosť vyšetrovateľa.
          </p>
          <div className="flex flex-wrap gap-3">
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

        <section className="grid gap-4 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, detail }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="mt-3 text-sm font-semibold">{title}</h2>
              <p className="mt-1 text-caption">{detail}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
