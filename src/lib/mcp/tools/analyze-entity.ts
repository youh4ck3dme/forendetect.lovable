import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { caseAnalysis, text } from "../analysis";

export default defineTool({
  name: "analyze_entity",
  title: "Analyze entity",
  description:
    "Run the shell-company and risk detectors for one entity (by id or name) and return its flags, score and related transactions.",
  inputSchema: {
    entity: z
      .string()
      .trim()
      .min(1)
      .describe("Entity id or (part of) its name."),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async ({ entity }, ctx) => {
    const a = await caseAnalysis(ctx);
    const q = entity.toLowerCase();
    const found =
      a.entities.find((e) => e.entity.id.toLowerCase() === q) ??
      a.entities.find((e) => e.entity.name.toLowerCase().includes(q));
    if (!found) {
      throw new ToolError(
        `No entity matches "${entity}". Known ids: ${a.entities.map((e) => e.entity.id).join(", ")}`,
      );
    }
    const related = a.transactions
      .filter(
        (t) =>
          t.transaction.fromId === found.entity.id ||
          t.transaction.toId === found.entity.id ||
          t.transaction.payerId === found.entity.id,
      )
      .map((t) => ({ ...t.transaction, score: t.score, level: t.level }));
    return text({
      entity: found.entity,
      score: found.score,
      level: found.level,
      isShell: found.isShell,
      flags: found.flags,
      weaponCount: found.weaponCount,
      totalVolume: found.totalVolume,
      transactions: related,
    });
  },
});
