import { defineTool } from "@lovable.dev/mcp-js";
import { caseAnalysis, text } from "../analysis";

export default defineTool({
  name: "network_analysis",
  title: "Network and laundering analysis",
  description:
    "Trafficking chains, traced money paths, laundering signals, cross-border corridors and temporal patterns of the case.",
  inputSchema: {},
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async (_args, ctx) => {
    const a = await caseAnalysis(ctx);
    const nameOf = (id: string) =>
      a.entities.find((e) => e.entity.id === id)?.entity.name ?? id;
    return text({
      chains: a.chains.map((c) => ({
        shell: nameOf(c.shellId),
        suppliers: c.supplierIds.map(nameOf),
        buyers: c.buyerIds.map(nameOf),
        severity: c.severity,
      })),
      moneyPaths: a.moneyPaths.map((p) => ({
        id: p.id,
        route: p.entityIds.map(nameOf),
        hops: p.hops,
        amount: p.amount,
        spanDays: p.spanDays,
        crossesBorder: p.crossesBorder,
        returnsToOrigin: p.returnsToOrigin,
        score: p.score,
        severity: p.severity,
      })),
      launderingSignals: a.launderingSignals.map((s) => ({
        ...s,
        entity: nameOf(s.entityId),
      })),
      corridors: a.corridors,
      crossBorderAlerts: a.crossBorder,
      temporalPatterns: a.temporalPatterns,
    });
  },
});
