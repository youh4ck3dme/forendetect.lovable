import { useActiveCase } from "@/hooks/useActiveCase";
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  Globe2,
  Layers,
  MoreVertical,
  SlidersHorizontal,
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
import { BalanceChart, DonutChart } from "@/components/malte/Charts";
import { Button } from "@/components/ui/button";
import { RiskFilter } from "@/components/malte/RiskFilter";
import { DetectorSheet, type DetectorTarget } from "@/components/malte/DetectorSheet";
import { useCaseStore, passesFilter } from "@/hooks/useCaseStore";
import { exportCaseReport } from "@/lib/report";
import { toast } from "sonner";
import {
  formatDate,
  formatEur,
  severityLabel,
  type Severity,
} from "@/forensic";

export const Route = createFileRoute("/_authenticated/analyza-vypisov")({
  head: () => ({
    meta: [
      { title: "Analýza transakcií — Malte" },
      {
        name: "description",
        content:
          "Detekcia zaokrúhlených súm, hotovostných platieb, platieb tretích strán a rizikových cezhraničných tokov.",
      },
      { property: "og:title", content: "Analýza transakcií — Malte" },
      {
        property: "og:description",
        content: "Automatické vyhodnotenie transakcií prípadu podľa forenzných pravidiel.",
      },
    ],
  }),
  component: StatementAnalysis,
});


const flagIcon = { critical: AlertTriangle, high: AlertTriangle, medium: Layers, low: Banknote };
const flagTone = {
  critical: "bg-risk-high text-risk-high-foreground",
  high: "bg-risk-high/12 text-risk-high",
  medium: "bg-risk-medium/15 text-risk-medium",
  low: "bg-risk-low/15 text-risk-low",
};

function StatementAnalysis() {
  const { activeCase, analysis } = useActiveCase();
  const { transactions, totals, crossBorder } = analysis;
  const { state, countExport } = useCaseStore();
  const [target, setTarget] = useState<DetectorTarget | null>(null);
  const cash = activeCase.transactions
    .filter((t) => t.method === "cash")
    .reduce((s, t) => s + t.amount, 0);
  const transfer = totals.volume - cash;
  const sorted = [...activeCase.transactions].sort((a, b) => a.date.localeCompare(b.date));
  const cumulative = sorted.reduce<number[]>((acc, t) => {
    acc.push((acc[acc.length - 1] ?? 0) + t.amount);
    return acc;
  }, []);
  const counts = transactions.reduce<Partial<Record<Severity, number>>>((acc, t) => {
    acc[t.level] = (acc[t.level] ?? 0) + 1;
    return acc;
  }, {});
  const flagged = [...transactions]
    .filter((t) => passesFilter(state.riskFilter, t.level))
    .sort((a, b) => b.score - a.score);

  return (
    <PhoneFrame>
      <AppHeader
        title="Analýza transakcií"
        back
        actions={
          <>
            <SlidersHorizontal className="h-5 w-5 opacity-90" aria-hidden />
            <MoreVertical className="h-5 w-5 opacity-90" aria-hidden />
          </>
        }
      />

      <Screen>
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Sumár transakcií</p>
              <p className="text-[11px] text-muted-foreground">
                {formatDate(sorted[0]!.date)} – {formatDate(sorted[sorted.length - 1]!.date)}
              </p>
              <p className="mt-3 text-2xl font-bold tracking-tight tnum">
                {formatEur(totals.volume)}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-risk-high">
                {Math.round(totals.cashRatio * 100)} % v hotovosti
              </p>
              <p className="text-[10px] text-muted-foreground">{totals.transactions} transakcií</p>
            </div>
            <DonutChart incomeRatio={1 - totals.cashRatio} />
          </div>

          <div className="mt-4 space-y-2">
            <Legend color="var(--income)" label="Bezhotovostné" value={formatEur(transfer)} />
            <Legend color="var(--expense)" label="Hotovosť" value={formatEur(cash)} />
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold">Kumulatívny objem</p>
              <p className="text-[11px] text-muted-foreground">Podľa dátumu transakcie</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">
                {formatDate(sorted[sorted.length - 1]!.date)}
              </p>
              <p className="text-sm font-semibold tnum">{formatEur(totals.volume)}</p>
            </div>
          </div>
          <div className="mt-3">
            <BalanceChart data={cumulative} />
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground tnum">
              <span>{formatDate(sorted[0]!.date)}</span>
              <span>{formatDate(sorted[sorted.length - 1]!.date)}</span>
            </div>
          </div>
        </Card>

        {crossBorder.length > 0 ? (
          <Card className="space-y-3">
            <div className="flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-primary" aria-hidden />
              <p className="text-sm font-semibold">Cezhraničné toky</p>
            </div>
            {crossBorder.map((flow) => (
              <button
                type="button"
                key={flow.transactionId}
                onClick={() => setTarget({ kind: "transaction", id: flow.transactionId })}
                className="flex w-full items-center gap-3 rounded-lg text-xs transition-colors hover:bg-accent"
              >
                <span className="rounded-lg bg-primary/10 px-2 py-1 font-semibold text-primary">
                  {flow.route}
                </span>
                <span className="tnum text-muted-foreground">{formatEur(flow.amount)}</span>
                <span className="ml-auto">
                  <RiskChip level={flow.score >= 80 ? "critical" : "high"}>{flow.score}</RiskChip>
                </span>
              </button>
            ))}
          </Card>
        ) : null}

        {analysis.temporalPatterns.length > 0 ? (
          <Card className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" aria-hidden />
              <p className="text-sm font-semibold">Časové vzory</p>
            </div>
            {analysis.temporalPatterns.map((p) => (
              <button
                type="button"
                key={`${p.code}-${p.transactionIds[0] ?? "x"}`}
                onClick={() =>
                  p.transactionIds[0]
                    ? setTarget({ kind: "transaction", id: p.transactionIds[0] })
                    : undefined
                }
                className="w-full space-y-1 rounded-lg text-left transition-colors hover:bg-accent"
              >
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold">{p.label}</p>
                  <span className="ml-auto">
                    <RiskChip level={p.severity}>{p.score}/100</RiskChip>
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">{p.detail}</p>
                <p className="text-[10px] text-muted-foreground tnum">
                  {p.transactionIds.length} transakcií
                </p>
              </button>
            ))}
          </Card>
        ) : null}

        <SectionTitle>Detekcia ({flagged.length})</SectionTitle>

        <RiskFilter counts={counts} />

        <Card className="divide-y divide-border p-0">
          {flagged.map(({ transaction, flags, level, score }) => {
            const Icon = flagIcon[level];
            return (
              <button
                type="button"
                key={transaction.id}
                onClick={() => setTarget({ kind: "transaction", id: transaction.id })}
                className="block w-full space-y-2 p-4 text-left transition-colors hover:bg-accent"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${flagTone[level]}`}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{transaction.description}</p>
                    <p className="truncate text-[11px] text-muted-foreground tnum">
                      {formatDate(transaction.date)} • {formatEur(transaction.amount)} •{" "}
                      {transaction.method === "cash" ? "hotovosť" : "prevod"}
                    </p>
                  </div>
                  <span className="ml-auto">
                    <RiskChip level={level}>
                      {severityLabel[level]} {score}
                    </RiskChip>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 pl-12">
                  {flags.map((flag) => (
                    <span
                      key={flag.code}
                      className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground"
                      title={flag.detail}
                    >
                      {flag.label}
                    </span>
                  ))}
                  {flags.length === 0 ? (
                    <span className="text-[10px] text-muted-foreground">Bez príznakov</span>
                  ) : null}
                </div>
              </button>
            );
          })}
          {flagged.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground">
              Žiadna transakcia nezodpovedá filtru.
            </p>
          ) : null}
        </Card>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            const ok = exportCaseReport(analysis, state.riskFilter);
            if (ok) {
              countExport();
              toast.success("Správa vygenerovaná — uložte ako PDF v dialógu tlače.");
            } else {
              toast.error("Export sa nepodarilo spustiť.");
            }
          }}
        >
          Exportovať výsledky do PDF
        </Button>
      </Screen>

      <DetectorSheet target={target} onClose={() => setTarget(null)} />
      <BottomNav />
    </PhoneFrame>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-semibold tnum">{value}</span>
    </div>
  );
}
