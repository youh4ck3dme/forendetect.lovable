import { createFileRoute } from "@tanstack/react-router";
import { Plug, Terminal } from "lucide-react";
import {
  AppHeader,
  BottomNav,
  Card,
  PhoneFrame,
  Screen,
  SectionTitle,
} from "@/components/malte/Shell";

export const Route = createFileRoute("/_authenticated/mcp-info")({
  head: () => ({
    meta: [
      { title: "Agentné API (MCP) — Malte" },
      {
        name: "description",
        content:
          "Sedem read-only MCP nástrojov, ktorými AI asistenti čítajú forenznú analýzu vášho prípadu.",
      },
      { property: "og:title", content: "Agentné API (MCP) — Malte" },
      {
        property: "og:description",
        content: "Pripojte AI klienta na /mcp a čítajte alerty, subjekty, transakcie a zbrane.",
      },
    ],
  }),
  component: McpInfo,
});

const tools = [
  { name: "case_overview", detail: "Celkové rizikové skóre, súhrnné počty a top príznaky." },
  { name: "list_alerts", detail: "Zoznam zistení s filtrom podľa závažnosti." },
  { name: "list_entities", detail: "Osoby a firmy vrátane indikátorov schránkovej firmy." },
  { name: "analyze_entity", detail: "Detail subjektu: príznaky, transakcie, prepojenia." },
  { name: "analyze_transaction", detail: "Pravidlá monitoringu pre konkrétnu transakciu." },
  { name: "list_weapons", detail: "Register zbraní a zhody v databáze EUROPOL." },
  { name: "network_analysis", detail: "Reťazce, cesty peňazí a cezhraničné koridory." },
];

function McpInfo() {
  return (
    <PhoneFrame>
      <AppHeader
        title="Agentné API"
        back
        actions={<Plug className="h-5 w-5 opacity-90" aria-hidden />}
      />
      <Screen>
        <Card className="space-y-2">
          <p className="text-sm font-semibold">Pripojenie MCP klienta</p>
          <p className="text-caption">
            Malte vystavuje read-only MCP server. V AI klientovi pridajte server s touto adresou:
          </p>
          <pre className="overflow-x-auto rounded-xl bg-secondary p-3 font-mono text-[11px] text-secondary-foreground">
            {typeof window !== "undefined" ? `${window.location.origin}/mcp` : "/mcp"}
          </pre>
          <p className="text-caption">
            Transport: Streamable HTTP, protokol JSON-RPC 2.0, volanie nástroja cez
            <span className="font-mono"> tools/call</span>.
          </p>
        </Card>

        <SectionTitle>Nástroje ({tools.length})</SectionTitle>

        <Card className="divide-y divide-border p-0">
          {tools.map((tool) => (
            <div key={tool.name} className="flex items-start gap-3 p-4">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Terminal className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="font-mono text-xs font-semibold">{tool.name}</p>
                <p className="text-caption">{tool.detail}</p>
              </div>
            </div>
          ))}
        </Card>

        <Card>
          <p className="text-caption">
            Server je chránený OAuth prihlásením a sprístupňuje výhradne dáta vášho účtu. Nič sa cez
            neho nedá meniť. Podrobná dokumentácia je v repozitári v súbore docs/mcp-api.md.
          </p>
        </Card>
      </Screen>
      <BottomNav />
    </PhoneFrame>
  );
}
