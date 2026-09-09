import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { caseAnalysis, text } from "../analysis";

export default defineTool({
  name: "analyze_transaction",
  title: "Analyze transaction",
  description:
    "Run the transaction monitoring rules for one transaction id and return its flags and risk score.",
  inputSchema: { transactionId: z.string().trim().min(1) },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async ({ transactionId }, ctx) => {
    const a = await caseAnalysis(ctx);
    const found = a.transactions.find(
      (t) => t.transaction.id.toLowerCase() === transactionId.toLowerCase(),
    );
    if (!found) {
      throw new ToolError(
        `Unknown transaction "${transactionId}". Known ids: ${a.transactions.map((t) => t.transaction.id).join(", ")}`,
      );
    }
    const nameOf = (id?: string) =>
      id
        ? (a.entities.find((e) => e.entity.id === id)?.entity.name ?? id)
        : undefined;
    return text({
      transaction: {
        ...found.transaction,
        from: nameOf(found.transaction.fromId),
        to: nameOf(found.transaction.toId),
        payer: nameOf(found.transaction.payerId),
      },
      score: found.score,
      level: found.level,
      flags: found.flags,
    });
  },
});
