import { auth, defineMcp } from "@lovable.dev/mcp-js";
import analyzeEntity from "./tools/analyze-entity";
import analyzeTransaction from "./tools/analyze-transaction";
import caseOverview from "./tools/case-overview";
import legalContext from "./tools/legal-context";
import listAlerts from "./tools/list-alerts";
import listEntities from "./tools/list-entities";
import listWeapons from "./tools/list-weapons";
import networkAnalysis from "./tools/network-analysis";

// Direct auth host: the runtime SUPABASE_URL is a proxy on publish, which the
// MCP verifier rejects (RFC 8414 issuer mismatch). The project ref is stable.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "pixel-polish",
  title: "Pixel Polish",
  version: "0.1.0",
  instructions:
    "Forensic analysis tools over the signed-in user's own case data (Forendo). Start with `case_overview`, then use `list_alerts`, `list_entities`, `analyze_entity`, `analyze_transaction`, `list_weapons` and `network_analysis` and `legal_context` for detail. Data belongs to the authenticated token owner; tools are read-only and return empty results when the user has no case.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  // exactOptionalPropertyTypes: tools without an outputSchema widen fine at runtime.
  tools: [
    caseOverview,
    listAlerts,
    listEntities,
    analyzeEntity,
    analyzeTransaction,
    listWeapons,
    networkAnalysis,
    legalContext,
  ] as unknown as Parameters<typeof defineMcp>[0]["tools"],
});
