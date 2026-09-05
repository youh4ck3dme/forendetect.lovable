import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bot, Eye, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  AppHeader,
  BottomNav,
  Card,
  PhoneFrame,
  Screen,
  SectionTitle,
} from "@/components/malte/Shell";
import { EmptyState } from "@/components/malte/EmptyState";
import { Button } from "@/components/ui/button";
import { useActiveCase } from "@/hooks/useActiveCase";
import { getAiStatus, previewAiPayload, runAiTask, type AiRunResult, type AiTask } from "@/lib/ai.functions";
import { upsertTransaction } from "@/lib/case-data";
import { severityLabel } from "@/forensic";

export const Route = createFileRoute("/_authenticated/asistent")({
  head: () => ({
    meta: [
      { title: "AI asistent — Forendo" },
      {
        name: "description",
        content:
          "Vysvetlenie zistení, návrh zhrnutia prípadu a normalizácia popisov platieb. Návrhy prijíma používateľ.",
      },
      { property: "og:title", content: "AI asistent — Forendo" },
      {
        property: "og:description",
        content: "AI navrhuje text a úpravy popisov; sumy, dátumy ani skóre nemení.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Assistant,
});

const TASK_LABELS: Record<AiTask, string> = {
  explain_finding: "Vysvetliť vybraný nález",
  case_summary: "Návrh zhrnutia prípadu",
  normalize_descriptions: "Normalizovať popisy platieb",
};

type Suggestion = {
  transaction: string;
  normalized: string;
  counterparty?: string;
  confidence: string;
};

function Assistant() {
  const { activeCase, analysis, hasCase, revisions, refresh } = useActiveCase();
  const [task, setTask] = useState<AiTask>("case_summary");
  const [alertId, setAlertId] = useState<string>(analysis.alerts[0]?.id ?? "");
  const [result, setResult] = useState<AiRunResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});

  const status = useQuery({
    queryKey: ["ai-status"],
    queryFn: () => getAiStatus(),
    enabled: hasCase,
  });

  const output = result?.output as
    | { summary?: string; explanation?: string; unverified?: string[]; cited?: string[]; suggestions?: Suggestion[]; idMap?: { transactions: Record<string, string> } }
    | undefined;

  const text = output?.summary ?? output?.explanation ?? "";
  const suggestions = useMemo(() => output?.suggestions ?? [], [output]);

  async function run() {
    if (busy || !hasCase) return;
    setBusy(true);
    setResult(null);
    try {
      const value = await runAiTask({
        data: { caseId: activeCase.id, task, ...(task === "explain_finding" ? { alertId } : {}) },
      });
      setResult(value);
      if (value.status !== "ok" && value.status !== "not_configured") {
        toast.error(value.message ?? "Volanie AI zlyhalo.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Volanie AI zlyhalo.");
    } finally {
      setBusy(false);
    }
  }

  async function showPreview() {
    try {
      const value = await previewAiPayload({
        data: { caseId: activeCase.id, task, ...(task === "explain_finding" ? { alertId } : {}) },
      });
      setPreview(JSON.stringify(value.payload, null, 2));
    } catch {
      toast.error("Náhľad sa nepodarilo zostaviť.");
    }
  }

  async function acceptSuggestion(suggestion: Suggestion) {
    const realId = output?.idMap?.transactions?.[suggestion.transaction];
    const transaction = activeCase.transactions.find((t) => t.id === realId);
    if (!transaction) {
      toast.error("Transakcia sa už nenašla — obnovte prípad.");
      return;
    }
    try {
      await upsertTransaction({
        data: {
          id: transaction.id,
          expectedRevision: revisions[transaction.id],
          caseId: activeCase.id,
          date: transaction.date,
          amount: transaction.amount,
          currency: transaction.currency,
          method: transaction.method,
          fromId: transaction.fromId,
          toId: transaction.toId,
          originCountry: transaction.originCountry,
          destinationCountry: transaction.destinationCountry,
          description: suggestion.normalized,
        },
      });
      setAccepted({ ...accepted, [suggestion.transaction]: true });
      refresh();
      toast.success("Popis upravený.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Úpravu sa nepodarilo uložiť.");
    }
  }

  if (!hasCase) {
    return (
      <PhoneFrame>
        <AppHeader title="AI asistent" />
        <Screen>
          <EmptyState
            icon={Bot}
            title="Najprv vytvorte prípad"
            detail="Asistent pracuje nad dátami konkrétneho prípadu."
          />
        </Screen>
        <BottomNav />
      </PhoneFrame>
    );
  }

  const notConfigured = status.data && !status.data.configured;

  return (
    <PhoneFrame>
      <AppHeader title="AI asistent" />
      <Screen>
        <Card className="space-y-2">
          <h1 className="text-base font-semibold tracking-tight">Asistent nad prípadom</h1>
          <p className="text-caption">
            AI iba navrhuje text. Sumy, dátumy, skóre ani originály súborov nemení a nemôže meniť —
            každú úpravu popisu musíte výslovne prijať. Detektory, import aj report fungujú aj vtedy,
            keď je AI nedostupná.
          </p>
          {status.data ? (
            <p className="text-caption">
              Stav: {status.data.configured ? `pripravené (${status.data.model})` : "nenakonfigurované — ukážkový režim"} •
              využité {status.data.used}/{status.data.dailyLimit} volaní za 24 hodín
            </p>
          ) : null}
        </Card>

        {notConfigured ? (
          <Card className="space-y-1">
            <p className="flex items-center gap-2 text-xs text-risk-medium">
              <ShieldAlert className="h-4 w-4" aria-hidden /> AI nie je nakonfigurovaná
            </p>
            <p className="text-caption">
              Chýba serverový kľúč poskytovateľa. Tlačidlá nižšie fungujú, ale namiesto odpovede
              zobrazia iba náhľad dát, ktoré by sa odosielali.
            </p>
          </Card>
        ) : null}

        <SectionTitle>Úloha</SectionTitle>
        <Card className="space-y-3">
          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Čo má asistent urobiť</span>
            <select
              aria-label="Úloha asistenta"
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              value={task}
              onChange={(e) => setTask(e.target.value as AiTask)}
            >
              {(Object.keys(TASK_LABELS) as AiTask[]).map((key) => (
                <option key={key} value={key}>
                  {TASK_LABELS[key]}
                </option>
              ))}
            </select>
          </label>

          {task === "explain_finding" ? (
            <label className="block space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">Nález</span>
              <select
                aria-label="Nález"
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={alertId}
                onChange={(e) => setAlertId(e.target.value)}
              >
                {analysis.alerts.length === 0 ? <option value="">Žiadne zistenia</option> : null}
                {analysis.alerts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {severityLabel[a.severity]} — {a.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <Button className="w-full" onClick={run} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null} Spustiť
          </Button>
          <Button variant="outline" className="w-full" onClick={showPreview}>
            <Eye className="h-4 w-4" aria-hidden /> Zobraziť odosielané dáta
          </Button>
        </Card>

        {preview ? (
          <Card className="space-y-2">
            <p className="text-xs font-semibold">Presný obsah odosielaný poskytovateľovi</p>
            <p className="text-caption">
              Mená, IČO ani adresy sa neposielajú — nahrádzajú sa pseudonymami (S1, T1). Voľný text
              popisu sa však odosiela tak, ako ste ho zadali.
            </p>
            <pre className="max-h-64 overflow-auto rounded-xl bg-muted p-3 text-[10px] leading-relaxed">
              {preview}
            </pre>
          </Card>
        ) : null}

        {result && result.status !== "ok" ? (
          <Card className="space-y-1">
            <p className="text-xs font-semibold text-risk-medium">
              {result.status === "not_configured"
                ? "AI nie je nakonfigurovaná"
                : result.status === "limit_reached"
                  ? "Denný limit vyčerpaný"
                  : "Volanie zlyhalo"}
            </p>
            <p className="text-caption">{result.message}</p>
          </Card>
        ) : null}

        {result?.status === "ok" && text ? (
          <>
            <SectionTitle>Návrh textu od AI</SectionTitle>
            <Card className="space-y-2">
              <p className="text-caption">
                Text vytvorila jazyková AI ({result.model}, šablóna {result.promptVersion}). Nie je to
                zistenie detektora ani fakt.
              </p>
              <p className="whitespace-pre-wrap text-sm">{text}</p>
              {output?.unverified?.length ? (
                <div className="space-y-1">
                  <p className="text-xs font-semibold">Neoverené tvrdenia</p>
                  {output.unverified.map((u) => (
                    <p key={u} className="text-caption">
                      • {u}
                    </p>
                  ))}
                </div>
              ) : null}
              {output?.cited?.length ? (
                <p className="text-caption">Odkazy na záznamy: {output.cited.join(", ")}</p>
              ) : null}
            </Card>
          </>
        ) : null}

        {result?.status === "ok" && suggestions.length > 0 ? (
          <>
            <SectionTitle>Návrhy úprav popisov</SectionTitle>
            <Card className="space-y-3">
              <p className="text-caption">
                Nič sa neuloží automaticky. Prijatím sa zmení iba popis transakcie — suma, dátum ani
                strany ostávajú nedotknuté.
              </p>
              {suggestions.map((s) => {
                const realId = output?.idMap?.transactions?.[s.transaction];
                const current = activeCase.transactions.find((t) => t.id === realId);
                return (
                  <div key={s.transaction} className="space-y-1 border-t border-border pt-2">
                    <p className="text-caption">Pôvodne: {current?.description || "—"}</p>
                    <p className="text-sm font-medium">{s.normalized}</p>
                    {s.counterparty ? (
                      <p className="text-caption">Možná protistrana: {s.counterparty} (na overenie)</p>
                    ) : null}
                    <p className="text-caption">Istota podľa AI: {s.confidence}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={accepted[s.transaction]}
                      onClick={() => void acceptSuggestion(s)}
                    >
                      {accepted[s.transaction] ? "Prijaté" : "Prijať návrh"}
                    </Button>
                  </div>
                );
              })}
            </Card>
          </>
        ) : null}
      </Screen>
      <BottomNav />
    </PhoneFrame>
  );
}
