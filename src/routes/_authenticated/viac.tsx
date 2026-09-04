import { useActiveCase } from "@/hooks/useActiveCase";
import { createFileRoute, Link } from "@tanstack/react-router";
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
      { title: "Viac — Malte" },
      {
        name: "description",
        content:
          "Časová os prípadu, register zbraní, audit log a nastavenia bezpečnosti aplikácie Malte.",
      },
      { property: "og:title", content: "Viac — Malte" },
      { property: "og:description", content: "Časová os prípadu, dokumenty, export a bezpečnosť." },
    ],
  }),
  component: More,
});


const links = [
  { title: "Dôkazy a dokumenty", detail: "Evidencia spisového materiálu", icon: FileText },
  { title: "Audit log", detail: "Kompletná história úkonov", icon: History },
  { title: "Bezpečnosť", detail: "Šifrované úložisko, 2FA", icon: Lock },
  { title: "Export prípadu", detail: "PDF / CSV výstup", icon: Share2 },
  { title: "O aplikácii", detail: "Malte • verzia 1.0.0", icon: Info },
];

function More() {
  const { activeCase, analysis } = useActiveCase();
  const { state, countExport, reset } = useCaseStore();

  return (
    <PhoneFrame>
      <AppHeader title="Viac" />

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

        <Link to="/zbrane" className="block">
          <Card className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Crosshair className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold">Register zbraní</p>
              <p className="text-[11px] text-muted-foreground">
                {analysis.totals.europolMatches} zhôd v databáze EUROPOL
              </p>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" aria-hidden />
          </Card>
        </Link>

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
            <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" aria-hidden />
          </Card>
        </Link>

        <a href="/malte-source.zip" download className="block">
          <Card className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Download className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Stiahnuť zdrojový kód (ZIP)</p>
              <p className="truncate text-[11px] text-muted-foreground">
                Celý repozitár bez node_modules — náhrada za GitHub prepojenie
              </p>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" aria-hidden />
          </Card>
        </a>



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
            Stav je uložený v prehliadači (IndexedDB) a prežije obnovenie stránky.
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
              <div key={`${run.id}-${run.at}`} className="flex items-center gap-3 p-4">
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
                  <p className="truncate text-sm font-semibold">{event.title}</p>
                  <RiskChip level={event.severity}>{severityLabel[event.severity]}</RiskChip>
                </div>
                <p className="text-[11px] text-muted-foreground">{event.detail}</p>
                <p className="text-[10px] text-muted-foreground tnum">{formatDate(event.date)}</p>
              </div>
            </div>
          ))}
        </Card>

        <SectionTitle>Nastavenia</SectionTitle>

        <Card className="divide-y divide-border p-0">
          {links.map(({ title, detail, icon: Icon }) => (
            <div key={title} className="flex items-center gap-3 p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{title}</p>
                <p className="truncate text-[11px] text-muted-foreground">{detail}</p>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" aria-hidden />
            </div>
          ))}
        </Card>

        <Button
          className="w-full"
          onClick={() => {
            if (exportCaseReport(analysis, state.riskFilter)) {
              countExport();
              toast.success("Správa vygenerovaná — uložte ako PDF v dialógu tlače.");
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
      </Screen>

      <BottomNav />
    </PhoneFrame>
  );
}
