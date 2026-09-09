import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { caseAnalysis, text } from "../analysis";

export default defineTool({
  name: "list_entities",
  title: "List entities",
  description:
    "List all persons and companies in the case with their risk score, risk level and shell-company status.",
  inputSchema: {
    kind: z.enum(["person", "company"]).optional(),
    shellOnly: z
      .boolean()
      .default(false)
      .describe("Return only entities detected as shell companies."),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async ({ kind, shellOnly }, ctx) => {
    let items = (await caseAnalysis(ctx)).entities;
    if (kind) items = items.filter((e) => e.entity.kind === kind);
    if (shellOnly) items = items.filter((e) => e.isShell);
    return text({
      total: items.length,
      items: items.map((e) => ({
        id: e.entity.id,
        name: e.entity.name,
        kind: e.entity.kind,
        role: e.entity.role,
        country: e.entity.country,
        ico: e.entity.ico,
        score: e.score,
        level: e.level,
        isShell: e.isShell,
        weaponCount: e.weaponCount,
        totalVolume: e.totalVolume,
      })),
    });
  },
});
