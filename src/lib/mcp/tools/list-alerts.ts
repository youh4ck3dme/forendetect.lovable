import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { caseAnalysis, text } from "../analysis";

export default defineTool({
  name: "list_alerts",
  title: "List alerts",
  description:
    "List detected forensic alerts, sorted by score, optionally filtered by severity or source.",
  inputSchema: {
    severity: z
      .enum(["critical", "high", "medium", "low"])
      .optional()
      .describe(
        "Minimum severity is not applied; filters to this exact level.",
      ),
    source: z
      .enum([
        "entita",
        "transakcia",
        "zbraň",
        "sieť",
        "cezhraničné",
        "pranie peňazí",
        "časový vzor",
      ])
      .optional()
      .describe("Detector family the alert came from."),
    limit: z.number().int().min(1).max(100).default(20),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async ({ severity, source, limit }, ctx) => {
    let items = (await caseAnalysis(ctx)).alerts;
    if (severity) items = items.filter((a) => a.severity === severity);
    if (source) items = items.filter((a) => a.source === source);
    return text({ total: items.length, items: items.slice(0, limit) });
  },
});
