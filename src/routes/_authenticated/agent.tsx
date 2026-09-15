import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Loader2, Play, RotateCcw, Sparkle } from "lucide-react";
import {
  AppHeader,
  BottomNav,
  Card,
  PhoneFrame,
  Screen,
  SectionTitle,
} from "@/components/malte/Shell";
import { EmptyState } from "@/components/malte/EmptyState";
import { useActiveCase } from "@/hooks/useActiveCase";
import {
  decideAgentLead,
  listAgentLeads,
  resetAgentLearning,
  runAgentScan,
} from "@/lib/agent.functions";
import { LEAD_TYPE_LABEL, LEAD_TYPES, type LeadType } from "@/lib/agent/leads";
import { SUPPRESS_BELOW, weightOf } from "@/lib/agent/scoring";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/agent")({
  head: () => ({
    meta: [
      { title: "Vyšetrovací agent — Forendo" },
      {
        name: "description",
        content:
          "Agent prejde dáta prípadu, navrhne línie vyšetrovania a učí sa z vašich rozhodnutí o jednotlivých stopách.",
      },
      { property: "og:title", content: "Vyšetrovací agent — Forendo" },
      {
        property: "og:description",
        content:
          "Deterministické stopy z vašich dát s označenými AI vysvetleniami a návrhmi ďalších krokov.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AgentScreen,
});

const DECISION_LABEL: Record<string, string> = {
  new: "Nerozhodnuté",
  follow: "Sledované",
  snooze: "Odložené",
  dismiss: "Nerelevantné",
};

function AgentScreen() {
  const { activeCaseId, activeCase, hasCase } = useActiveCase();
  const queryClient = useQueryClient();
  const list = useServerFn(listAgentLeads);
  const scan = useServerFn(runAgentScan);
  const decide = useServerFn(decideAgentLead);
  const reset = useServerFn(resetAgentLearning);
  const [showSuppressed, setShowSuppressed] = useState(false);
  const [typeFilter, setTypeFilter] = useState<LeadType | "all">("all");
  const [message, setMessage] = useState<string | null>(null);

  const leadsQuery = useQuery({
    queryKey: ["agent-leads", activeCaseId],
    enabled: Boolean(activeCaseId),
    queryFn: () => list({ data: { caseId: activeCaseId! } }),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["agent-leads", activeCaseId] });

  const scanMutation = useMutation({
    mutationFn: () => scan({ data: { caseId: activeCaseId!, withAi: true } }),
    onSuccess: (res) => {
      setMessage(
        res.aiMessage ??
          `Beh dokončený: ${res.newLeads} nových stôp z ${res.totalLeads} nájdených.`,
      );
      void invalidate();
    },
    onError: (e: Error) => setMessage(e.message),
  });

  const decideMutation = useMutation({
    mutationFn: (vars: { leadId: string; decision: "follow" | "snooze" | "dismiss" }) =>
      decide({ data: vars }),
    onSuccess: () => void invalidate(),
    onError: (e: Error) => setMessage(e.message),
  });

  const resetMutation = useMutation({
    mutationFn: () => reset({}),
    onSuccess: () => {
      setMessage("Naučené preferencie boli vynulované.");
      void invalidate();
    },
  });

  const weights = leadsQuery.data?.weights ?? {};
  const leads = useMemo(() => {
    const all = leadsQuery.data?.leads ?? [];
    return all.filter((l) => {
      if (typeFilter !== "all" && l.leadType !== typeFilter) return false;
      if (!showSuppressed && weightOf(weights, l.leadType) < SUPPRESS_BELOW) return false;
      if (!showSuppressed && l.decision === "dismiss") return false;
      return true;
    });
  }, [leadsQuery.data, typeFilter, showSuppressed, weights]);

  const lastRun = leadsQuery.data?.lastRun ?? null;

  return (
    <PhoneFrame>
      <AppHeader
        title="Vyšetrovací agent"
        back
        actions={<Bot className="h-5 w-5 opacity-90" aria-hidden />}
      />
      <Screen>
        <Card className="space-y-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              {hasCase ? activeCase.name : "Žiadny aktívny prípad"}
            </h2>
            <p className="text-caption">
              {lastRun
                ? `Posledný beh ${new Date(lastRun.createdAt).toLocaleString("sk-SK")} • ${lastRun.leadsCount} stôp`
                : "Agent zatiaľ tento prípad neprešiel."}
            </p>
          </div>
          <p className="text-caption">
            Agent nenahrádza analytika. Stopy vychádzajú z deterministických pravidiel;
            texty od AI sú označené ako hypotéza alebo vysvetlenie.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!activeCaseId || scanMutation.isPending}
              onClick={() => scanMutation.mutate()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
            >
              {scanMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Play className="h-4 w-4" aria-hidden />
              )}
              {scanMutation.isPending ? "Agent pracuje…" : "Prebehnúť prípad"}
            </button>
            <button
              type="button"
              onClick={() => resetMutation.mutate()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Zabudnúť naučené
            </button>
          </div>
          {message ? (
            <p role="status" aria-live="polite" className="text-caption">
              {message}
            </p>
          ) : null}
        </Card>

        <SectionTitle>Filtre</SectionTitle>
        <Card className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(["all", ...LEAD_TYPES] as Array<LeadType | "all">).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={typeFilter === t}
                onClick={() => setTypeFilter(t)}
                className={cn(
                  "min-h-9 rounded-lg border px-3 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  typeFilter === t
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted",
                )}
              >
                {t === "all" ? "Všetko" : LEAD_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-caption">
            <input
              type="checkbox"
              checked={showSuppressed}
              onChange={(e) => setShowSuppressed(e.target.checked)}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            Zobraziť potlačené a odmietnuté stopy
          </label>
        </Card>

        <SectionTitle>Navrhnuté línie vyšetrovania</SectionTitle>
        {leadsQuery.isLoading ? (
          <Card className="flex items-center gap-2 text-caption">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Načítavam stopy…
          </Card>
        ) : leads.length === 0 ? (
          <EmptyState
            icon={Bot}
            title="Zatiaľ žiadne stopy"
            detail={
              hasCase
                ? "Spustite beh agenta nad dátami prípadu. Ak prípad nemá transakcie, najskôr importujte výpisy."
                : "Vytvorte alebo vyberte prípad a potom spustite beh agenta."
            }
          />
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => (
              <Card key={lead.id} className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                    {LEAD_TYPE_LABEL[lead.leadType] ?? lead.leadType}
                  </span>
                  <span className="text-caption">{DECISION_LABEL[lead.decision]}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-tight">{lead.title}</p>
                  <p className="text-caption">{lead.reason}</p>
                </div>

                {lead.refs.length ? (
                  <ul className="flex flex-wrap gap-1.5">
                    {lead.refs.map((r) => (
                      <li
                        key={`${r.type}-${r.id}`}
                        className="rounded-md border border-border px-2 py-0.5 text-[11px]"
                      >
                        {r.label}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {lead.aiExplanation ? (
                  <details className="rounded-lg border border-border bg-muted/40 p-3">
                    <summary className="cursor-pointer text-xs font-semibold">
                      AI vysvetlenie (hypotéza)
                    </summary>
                    <p className="pt-2 text-caption">{lead.aiExplanation}</p>
                  </details>
                ) : null}

                {lead.aiSteps.length ? (
                  <div>
                    <p className="flex items-center gap-1 text-xs font-semibold">
                      <Sparkle className="h-3.5 w-3.5" aria-hidden /> Navrhované ďalšie kroky
                    </p>
                    <ul className="list-disc space-y-1 pl-5 pt-1">
                      {lead.aiSteps.map((s, i) => (
                        <li key={i} className="text-caption">
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["follow", "Sledovať"],
                      ["snooze", "Odložiť"],
                      ["dismiss", "Nerelevantné"],
                    ] as Array<["follow" | "snooze" | "dismiss", string]>
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={lead.decision === value}
                      disabled={decideMutation.isPending}
                      onClick={() =>
                        decideMutation.mutate({ leadId: lead.id, decision: value })
                      }
                      className={cn(
                        "min-h-11 rounded-xl border px-3 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50",
                        lead.decision === value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}

        <SectionTitle>Čo sa agent naučil</SectionTitle>
        <Card className="divide-y divide-border p-0">
          {LEAD_TYPES.map((t) => {
            const w = weightOf(weights, t);
            return (
              <div key={t} className="flex items-center justify-between gap-3 p-3">
                <p className="text-sm">{LEAD_TYPE_LABEL[t]}</p>
                <p className="text-caption font-mono">
                  váha {w.toFixed(2)}
                  {w < SUPPRESS_BELOW ? " • potlačené" : ""}
                </p>
              </div>
            );
          })}
        </Card>
      </Screen>
      <BottomNav />
    </PhoneFrame>
  );
}
