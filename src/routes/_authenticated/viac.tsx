import { useActiveCase } from "@/hooks/useActiveCase";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getSourceDownloadUrl } from "@/lib/source-download.functions";
import { LogOut } from "lucide-react";
import { clearClientState } from "@/lib/pwa";

import {
  ChevronRight,
  Crosshair,
  Download,
  FileText,
  History,
  Info,
  Lock,
  Plug,
  Share2,
} from "lucide-react";
import {
  AppHeader,
  BottomNav,
  Card,
  PhoneFrame,
  RiskChip,
  Screen,
  SectionTitle,
} from "@/components/malte/Shell";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/malte/ThemeToggle";
import { useCaseStore } from "@/hooks/useCaseStore";
import { exportCaseReport } from "@/lib/report";
import { toast } from "sonner";
import { formatDate, severityLabel } from "@/forensic";

export const Route = createFileRoute("/_authenticated/viac")({
  head: () => ({
    meta: [
      { title: "Účet a systém — Forendo" },
      {
        name: "description",
        content:
          "Vzhľad, predplatné, výstupy správ, agentné API a odhlásenie v aplikácii Forendo.",
      },
      { property: "og:title", content: "Účet a systém — Forendo" },
      {
        property: "og:description",
        content: "Vzhľad, výstupy, agentné API a odhlásenie.",
      },
    ],
  }),
  component: More,
});


function More() {
  const { activeCase, analysis } = useActiveCase();
  const { state, countExport, reset } = useCaseStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchSourceUrl = useServerFn(getSourceDownloadUrl);

  async function handleSourceDownload() {
    try {
      const { url } = await fetchSourceUrl({ data: undefined });
      window.location.href = url;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Stiahnutie zlyhalo.",
      );
    }
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    // Vyčistí citlivý klientský stav, aby ďalší účet na zariadení nevidel cudzie dáta.
    await clearClientState();
    void navigate({ to: "/auth", replace: true });
  }

  return (
    <PhoneFrame>
      <AppHeader title="Účet a systém" />

      <Screen>
        <Card className="flex items-center gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Vzhľad</p>
            <p className="text-caption">Svetlá, tmavá alebo podľa systému</p>
          </div>
          <span className="ml-auto">
            <ThemeToggle />
          </span>
        </Card>


        <Link to="/mcp-info" className="block">
          <Card className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Plug className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold">Agentné API (MCP)</p>
              <p className="text-[11px] text-muted-foreground">
                7 read-only nástrojov pre AI klientov
              </p>
            </div>
            <ChevronRight
              className="ml-auto h-4 w-4 text-muted-foreground"
              aria-hidden
            />
          </Card>
        </Link>

        <button
          type="button"
          onClick={handleSourceDownload}
          className="block w-full text-left"
        >
          <Card className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Download className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                Stiahnuť zdrojový kód (ZIP)
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                Dostupné len pre správcu — odkaz platí 5 minút
              </p>
            </div>
            <ChevronRight
              className="ml-auto h-4 w-4 text-muted-foreground"
              aria-hidden
            />
          </Card>
        </button>

        <details className="rounded-2xl border border-border/80 px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold">Stav práce v prípade</summary>
          <div className="space-y-4 pt-3">
        <SectionTitle>Priebeh analýzy</SectionTitle>

        <Card className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Preverené položky</span>
            <span className="font-semibold tnum">{state.reviewed.length}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Vygenerované správy</span>
            <span className="font-semibold tnum">{state.exports}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Aktívny filter</span>
            <span className="font-semibold">
              {state.riskFilter.length
                ? state.riskFilter.map((f) => severityLabel[f]).join(", ")
                : "všetko"}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Stav je uložený v prehliadači (IndexedDB) a prežije obnovenie
            stránky.
          </p>
        </Card>

        <SectionTitle>Posledné spustenia detektorov</SectionTitle>

        <Card className="divide-y divide-border p-0">
          {state.runLog.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground">
              Zatiaľ žiadne. Kliknite na subjekt alebo transakciu.
            </p>
          ) : (
            state.runLog.slice(0, 8).map((run) => (
              <div
                key={`${run.id}-${run.at}`}
                className="flex items-center gap-3 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{run.target}</p>
                  <p className="truncate font-mono text-[10px] text-muted-foreground">
                    {run.detector} • {run.flagCount} príznakov
                  </p>
                </div>
                <span className="ml-auto">
                  <RiskChip level={run.level}>{run.score}</RiskChip>
                </span>
              </div>
            ))
          )}
        </Card>

        <SectionTitle>Časová os prípadu</SectionTitle>

        <Card className="space-y-4">
          {activeCase.events.map((event) => (
            <div key={`${event.date}-${event.title}`} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                <span className="w-px flex-1 bg-border" />
              </div>
              <div className="min-w-0 pb-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold">
                    {event.title}
                  </p>
                  <RiskChip level={event.severity}>
                    {severityLabel[event.severity]}
                  </RiskChip>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {event.detail}
                </p>
                <p className="text-[10px] text-muted-foreground tnum">
                  {formatDate(event.date)}
                </p>
              </div>
            </div>
          ))}
        </Card>

          </div>
        </details>

        <SectionTitle>Výstupy</SectionTitle>

        <Button
          className="w-full"
          onClick={() => {
            if (exportCaseReport(analysis, state.riskFilter)) {
              countExport();
              toast.success(
                "Správa vygenerovaná — uložte ako PDF v dialógu tlače.",
              );
            } else {
              toast.error("Export sa nepodarilo spustiť.");
            }
          }}
        >
          Exportovať kompletnú správu (PDF)
        </Button>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            reset();
            toast.success("Lokálny stav analýzy bol vymazaný.");
          }}
        >
          Vymazať uložený stav
        </Button>

        <Button variant="ghost" className="w-full" onClick={handleSignOut}>
          <LogOut className="mr-1 h-4 w-4" aria-hidden /> Odhlásiť sa
        </Button>
      </Screen>

      <BottomNav />
    </PhoneFrame>
  );
}
