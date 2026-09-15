import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { caseAnalysis, text } from "../analysis";
import { generateLeads, LEAD_TYPES } from "@/lib/agent/leads";

export default defineTool({
  name: "agent_leads",
  title: "Investigative agent leads",
  description:
    "Deterministic investigative leads over the signed-in user's latest case: unclosed flows, missing links, isolated entities, time clusters, amount patterns, uncovered findings and data gaps. Read-only, no AI.",
  inputSchema: {
    leadType: z.enum(LEAD_TYPES).optional().describe("Filter to one lead type."),
    limit: z.number().int().min(1).max(100).default(20),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async ({ leadType, limit }, ctx) => {
    const analysis = await caseAnalysis(ctx);
    let leads = generateLeads({
      forensicCase: analysis.case,
      highRiskFindings: analysis.alerts
        .filter((a) => a.severity === "high" || a.severity === "critical")
        .slice(0, 12)
        .map((a) => ({ id: a.id, label: a.title })),
    });
    if (leadType) leads = leads.filter((l) => l.leadType === leadType);
    return text({ total: leads.length, items: leads.slice(0, limit) });
  },
});
