import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { caseAnalysis, text } from "../analysis";

export default defineTool({
  name: "list_weapons",
  title: "List weapons",
  description:
    "Weapon register of the case with watchlist serial matches, licence validity and holder.",
  inputSchema: {
    europolOnly: z
      .boolean()
      .default(false)
      .describe("Return only weapons matching the case watchlist of serial numbers."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ europolOnly }, ctx) => {
    const a = await caseAnalysis(ctx);
    const nameOf = (id: string) => a.entities.find((e) => e.entity.id === id)?.entity.name ?? id;
    const items = (europolOnly ? a.weapons.filter((w) => w.europolMatch) : a.weapons).map((w) => ({
      ...w.weapon,
      holder: nameOf(w.weapon.holderId),
      supplier: nameOf(w.weapon.supplierId),
      europolMatch: w.europolMatch,
      fuzzyMatch: w.fuzzyMatch ?? false,
      invalidLicence: w.invalidLicence,
      europolRecord: w.europolRecord,
      flags: w.flags,
    }));
    return text({ total: items.length, items });
  },
});
