import { useActiveCase } from "@/hooks/useActiveCase";
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, Search, User } from "lucide-react";
import {
  AppHeader,
  BottomNav,
  Card,
  PhoneFrame,
  RiskChip,
  Screen,
  SectionTitle,
} from "@/components/malte/Shell";
import { RiskFilter } from "@/components/malte/RiskFilter";
import { openCommandPalette } from "@/components/malte/CommandPalette";
import { EmptyState } from "@/components/malte/EmptyState";
import { DetectorSheet, type DetectorTarget } from "@/components/malte/DetectorSheet";
import { useCaseStore, passesFilter } from "@/hooks/useCaseStore";
import { cn } from "@/lib/utils";
import { formatEur, type Severity } from "@/forensic";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/osoby")({
  head: () => ({
    meta: [
      { title: "Subjekty — Malte" },
      {
        name: "description",
        content:
          "Osoby a firmy prípadu s vypočítaným rizikovým skóre, príznakmi schránkovej firmy a objemom transakcií.",
      },
      { property: "og:title", content: "Subjekty — Malte" },
      {
        property: "og:description",
        content: "Rizikový rebríček subjektov prípadu vrátane detekcie schránkových firiem.",
      },
    ],
  }),
  component: People,
});


type KindFilter = "all" | "person" | "company" | "shell";

function People() {
  const { activeCase, analysis } = useActiveCase();
  const { state } = useCaseStore();
  const [target, setTarget] = useState<DetectorTarget | null>(null);
  const [kind, setKind] = useState<KindFilter>("all");

  const counts = analysis.entities.reduce<Partial<Record<Severity, number>>>((acc, e) => {
    acc[e.level] = (acc[e.level] ?? 0) + 1;
    return acc;
  }, {});

  const visible = analysis.entities
    .filter((e) => passesFilter(state.riskFilter, e.level))
    .filter((e) => (kind === "all" ? true : kind === "shell" ? e.isShell : e.entity.kind === kind));

  const kinds: { id: KindFilter; label: string }[] = [
    { id: "all", label: "Všetky" },
    { id: "person", label: "Osoby" },
    { id: "company", label: "Firmy" },
    { id: "shell", label: "Schránkové" },
  ];

  return (
    <PhoneFrame>
      <AppHeader
        title="Subjekty"
        actions={
          <button
            type="button"
            onClick={openCommandPalette}
            aria-label="Hľadať v prípade"
            className="rounded-full p-1 transition-colors hover:bg-foreground/15"
          >
            <Search className="h-5 w-5 opacity-90" role="img" aria-label="Vyhľadávanie" />
          </button>
        }
      />
      <Screen>
        <div className="flex flex-wrap gap-2">
          {kinds.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setKind(option.id)}
              aria-pressed={kind === option.id}
              className={cn(
                "h-8 rounded-full border px-3 text-xs font-medium transition-colors",
                kind === option.id
                  ? "gradient-brand border-transparent text-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <RiskFilter counts={counts} />

        <SectionTitle>{visible.length} subjektov • zoradené podľa rizika</SectionTitle>

        <div className="space-y-3">
          {visible.map((item) => (
            <Card
              key={item.entity.id}
              className="cursor-pointer space-y-3 transition-colors hover:bg-accent/40"
              onClick={() => setTarget({ kind: "entity", id: item.entity.id })}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  {item.entity.kind === "person" ? (
                    <User className="h-4 w-4" aria-hidden />
                  ) : (
                    <Building2 className="h-4 w-4" aria-hidden />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{item.entity.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {item.entity.role}
                    {item.entity.ico ? ` • IČO ${item.entity.ico}` : ""}
                  </p>
                </div>
                <span className="ml-auto">
                  <RiskChip level={item.level}>{item.score}/100</RiskChip>
                </span>
              </div>

              {item.isShell ? (
                <p className="rounded-lg bg-risk-high/10 px-2 py-1 text-[11px] font-semibold text-risk-high">
                  Indikátory schránkovej firmy
                </p>
              ) : null}

              <div className="flex flex-wrap gap-1.5">
                {item.flags.map((flag) => (
                  <span
                    key={flag.code}
                    className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground"
                    title={flag.detail}
                  >
                    {flag.label}
                  </span>
                ))}
                {item.flags.length === 0 ? (
                  <span className="text-[11px] text-muted-foreground">
                    Bez detegovaných príznakov
                  </span>
                ) : null}
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground tnum">
                <span>Objem {formatEur(item.totalVolume)}</span>
                {state.reviewed.includes(`entity:${item.entity.id}`) ? (
                  <span className="inline-flex items-center gap-1 text-risk-low">
                    <CheckCircle2 className="h-3 w-3" aria-hidden />
                    Preverené
                  </span>
                ) : null}
                <span>{item.weaponCount} zbraní</span>
              </div>
            </Card>
          ))}
          {visible.length === 0 ? (
            <Card>
              <EmptyState
                title="Žiadny subjekt nezodpovedá filtru"
                detail="Skúste zmeniť typ subjektu alebo uvoľniť rizikový filter."
              />
            </Card>
          ) : null}
        </div>
      </Screen>
      <DetectorSheet target={target} onClose={() => setTarget(null)} />
      <BottomNav />
    </PhoneFrame>
  );
}
