import { defineTool } from "@lovable.dev/mcp-js";
import { buildLegalContext } from "@/forensic";
import { caseAnalysis, text } from "../analysis";

export default defineTool({
  name: "legal_context",
  title: "Legal context",
  description:
    "Slovak legal assessment of the signed-in user's case: provisions of 300/2005, 301/2005 and 460/1992 tied to concrete detections, per-law availability gaps and procedural roles of the persons involved.",
  inputSchema: {},
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async (_args, ctx) => {
    const legal = buildLegalContext(await caseAnalysis(ctx));
    return text({
      sources: legal.sources.map((s) => ({
        code: s.code,
        title: s.title,
        version: s.version,
        availability: s.availability,
      })),
      availableLaws: legal.availableLaws,
      unavailableLaws: legal.unavailableLaws,
      fullyBlocked: legal.fullyBlocked,
      gaps: legal.gaps,
      assessments: legal.assessments.map((a) => ({
        id: a.id,
        law: a.law,
        lawVersion: a.lawVersion,
        provision: a.provision,
        severity: a.severity,
        confidence: a.confidence,
        basis: a.basis,
        entityIds: a.entityIds,
      })),
      persons: legal.persons,
    });
  },
});
