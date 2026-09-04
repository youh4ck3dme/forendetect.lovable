import { useActiveCase } from "@/hooks/useActiveCase";
import { lazy, Suspense, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { Search, MoreVertical } from "lucide-react";
import {
  AppHeader,
  BottomNav,
  Card,
  PhoneFrame,
  RiskChip,
  Screen,
  SectionTitle,
} from "@/components/malte/Shell";
import { DetectorSheet, type DetectorTarget } from "@/components/malte/DetectorSheet";
import { cn } from "@/lib/utils";
import { COUNTRY_LABEL, formatEur } from "@/forensic";

const NetworkGraph = lazy(() =>
  import("@/components/malte/NetworkGraph").then((m) => ({ default: m.NetworkGraph })),
);

export const Route = createFileRoute("/_authenticated/siet")({
  head: () => ({
    meta: [
      { title: "Sieťová analýza — Malte" },
      {
        name: "description",
        content:
          "Interaktívny graf entít vášho prípadu s trasami peňazí, reťazcami obchodovania a cezhraničnými koridormi.",
      },
      { property: "og:title", content: "Sieťová analýza — Malte" },
      {
        property: "og:description",
        content: "Vizualizácia toku peňazí cez schránkové firmy a rizikové koridory EÚ.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NetworkScreen,
});


function NetworkScreen() {
  const { activeCase, analysis } = useActiveCase();
  const nameOf = (id: string) => analysis.entities.find((e) => e.entity.id === id)?.entity.name ?? id;
  const [target, setTarget] = useState<DetectorTarget | null>(null);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [pathId, setPathId] = useState<string | null>(analysis.moneyPaths[0]?.id ?? null);

  const activePath = analysis.moneyPaths.find((p) => p.id === pathId) ?? null;

  return (
    <PhoneFrame>
      <AppHeader
        title="Sieťová analýza"
        actions={
          <>
            <Search className="h-5 w-5 opacity-90" aria-hidden />
            <MoreVertical className="h-5 w-5 opacity-90" aria-hidden />
          </>
        }
      />

      <Screen>
        <Card className="overflow-hidden p-0">
          <ClientOnly
            fallback={
              <div className="flex h-[420px] items-center justify-center text-xs text-muted-foreground">
                Načítavam sieť…
              </div>
            }
          >
            <Suspense
              fallback={
                <div className="flex h-[420px] items-center justify-center text-xs text-muted-foreground">
                  Načítavam sieť…
                </div>
              }
            >
              <NetworkGraph
                analysis={analysis}
                {...(selectedId ? { selectedId } : {})}
                {...(activePath ? { highlightedPathIds: activePath.entityIds } : {})}
                onSelect={(id) => {
                  setSelectedId(id);
                  setTarget({ kind: "entity", id });
                }}
              />
            </Suspense>
          </ClientOnly>
        </Card>

        <SectionTitle>Trasy peňazí ({analysis.moneyPaths.length})</SectionTitle>
        <Card className="space-y-2 p-3">
          {analysis.moneyPaths.map((path) => (
            <button
              key={path.id}
              type="button"
              onClick={() => setPathId(path.id === pathId ? null : path.id)}
              aria-pressed={path.id === pathId}
              className={cn(
                "w-full space-y-1 rounded-xl border p-3 text-left transition-colors",
                path.id === pathId
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent",
              )}
            >
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold">
                  {path.hops} kroky • {formatEur(path.amount)}
                </p>
                <span className="ml-auto">
                  <RiskChip level={path.severity}>{path.score}/100</RiskChip>
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {path.entityIds.map(nameOf).join(" → ")}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {path.spanDays} dní
                {path.viaShellIds.length > 0
                  ? ` • cez ${path.viaShellIds.length} schránkovú firmu`
                  : ""}
                {path.crossesBorder ? " • cezhraničné" : ""}
                {path.returnsToOrigin ? " • návrat k pôvodcovi" : ""}
              </p>
            </button>
          ))}
          {analysis.moneyPaths.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Žiadna viackroková trasa nebola nájdená.
            </p>
          ) : null}
        </Card>

        <SectionTitle>Signály prania peňazí ({analysis.launderingSignals.length})</SectionTitle>
        <Card className="divide-y divide-border p-0">
          {analysis.launderingSignals.map((s) => (
            <button
              key={`${s.code}-${s.entityId}`}
              type="button"
              onClick={() => {
                setSelectedId(s.entityId);
                setTarget({ kind: "entity", id: s.entityId });
              }}
              className="w-full space-y-1 p-3 text-left transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold">
                  {s.label} — {nameOf(s.entityId)}
                </p>
                <span className="ml-auto">
                  <RiskChip level={s.severity}>{s.score}/100</RiskChip>
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">{s.detail}</p>
            </button>
          ))}
        </Card>

        <SectionTitle>Cezhraničné koridory</SectionTitle>
        <Card className="space-y-2">
          {analysis.corridors.map((c) => (
            <div key={c.route} className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold">
                  {COUNTRY_LABEL[c.originCountry] ?? c.originCountry} →{" "}
                  {COUNTRY_LABEL[c.destinationCountry] ?? c.destinationCountry}
                </span>
                <span className="ml-auto tnum text-muted-foreground">
                  {c.count}× • {formatEur(c.amount)}
                </span>
                <RiskChip level={c.severity}>{c.score}</RiskChip>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn("h-full rounded-full", c.highRisk ? "bg-risk-high" : "bg-primary")}
                  style={{ width: `${c.score}%` }}
                />
              </div>
            </div>
          ))}
        </Card>

        <SectionTitle>Reťazce obchodovania ({analysis.chains.length})</SectionTitle>
        <Card className="space-y-3">
          {analysis.chains.map((chain) => (
            <button
              key={chain.shellId}
              type="button"
              onClick={() => {
                setSelectedId(chain.shellId);
                setTarget({ kind: "entity", id: chain.shellId });
              }}
              className="block w-full space-y-1 rounded-lg text-left transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{nameOf(chain.shellId)}</p>
                <span className="ml-auto">
                  <RiskChip level={chain.severity}>
                    {chain.severity === "critical" ? "Kritické" : "Vysoké"}
                  </RiskChip>
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {chain.supplierIds.map(nameOf).join(", ")} →{" "}
                <span className="font-semibold text-risk-high">schránka</span> →{" "}
                {chain.buyerIds.map(nameOf).join(", ")}
              </p>
            </button>
          ))}
        </Card>
      </Screen>

      <DetectorSheet target={target} onClose={() => setTarget(null)} />
      <BottomNav />
    </PhoneFrame>
  );
}
