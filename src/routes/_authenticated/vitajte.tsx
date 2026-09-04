import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, FolderPlus, Radar, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/vitajte")({
  head: () => ({
    meta: [
      { title: "Vitajte v Malte" },
      {
        name: "description",
        content: "Krátky sprievodca: ako v Malte založiť prípad, spustiť detektory a čítať výsledky.",
      },
      { property: "og:title", content: "Vitajte v Malte" },
      { property: "og:description", content: "Tri kroky k prvému forenznému prípadu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Welcome,
});

const steps = [
  {
    icon: FolderPlus,
    title: "Založte prípad",
    detail:
      "V sekcii Prípady vytvoríte nový prípad a pridáte doň osoby, firmy a finančné transakcie. Vaše dáta vidíte len vy.",
  },
  {
    icon: Radar,
    title: "Spustite detektory",
    detail:
      "Malte automaticky hľadá schránkové firmy, pranie peňazí, cezhraničné toky, podozrivé zbrane a časové vzorce.",
  },
  {
    icon: Scale,
    title: "Čítajte výsledky",
    detail:
      "Každé zistenie má skóre rizika, vysvetlenie a odkaz na konkrétne ustanovenie zákona. Report viete exportovať do PDF.",
  },
];

function Welcome() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const current = steps[step]!;
  const Icon = current.icon;

  async function finish() {
    setBusy(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await supabase
          .from("profiles")
          .update({ onboarding_completed: true })
          .eq("id", data.user.id);
      }
    } catch {
      /* onboarding stav nie je kritický */
    }
    void navigate({ to: "/pripady", replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-background px-5 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-4 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
            <Icon className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight">{current.title}</h1>
          <p className="text-sm text-muted-foreground">{current.detail}</p>
        </div>

        <div className="flex justify-center gap-2" aria-hidden>
          {steps.map((s, i) => (
            <span
              key={s.title}
              className={
                i === step
                  ? "h-1.5 w-8 rounded-full bg-primary"
                  : "h-1.5 w-4 rounded-full bg-border"
              }
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="ghost" disabled={busy} onClick={finish}>
            Preskočiť
          </Button>
          {step < steps.length - 1 ? (
            <Button type="button" onClick={() => setStep(step + 1)}>
              Ďalej <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
            </Button>
          ) : (
            <Button type="button" disabled={busy} onClick={finish}>
              Vytvoriť prvý prípad
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
