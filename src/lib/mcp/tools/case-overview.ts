import { defineTool } from "@lovable.dev/mcp-js";
import { caseAnalysis, text } from "../analysis";

export default defineTool({
  name: "case_overview",
  title: "Case overview",
  description:
    "Summary of the signed-in user's most recent forensic case: overall risk score, totals and the strongest red flags.",
  inputSchema: {},
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async (_args, ctx) => {
    const a = await caseAnalysis(ctx);
    return text({
      case: {
        id: a.case.id,
        name: a.case.name,
        subtitle: a.case.subtitle,
        referenceDate: a.case.referenceDate,
      },
      caseScore: a.caseScore,
      caseLevel: a.caseLevel,
      totals: a.totals,
      alertCounts: {
        critical: a.alerts.filter((x) => x.severity === "critical").length,
        high: a.alerts.filter((x) => x.severity === "high").length,
        medium: a.alerts.filter((x) => x.severity === "medium").length,
        low: a.alerts.filter((x) => x.severity === "low").length,
      },
      topFlags: a.topFlags,
      chains: a.chains.length,
      moneyPaths: a.moneyPaths.length,
    });
  },
});
