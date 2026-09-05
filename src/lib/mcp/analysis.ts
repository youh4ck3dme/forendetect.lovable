import { analyzeCase, EMPTY_CASE } from "@/forensic";
import type { CaseAnalysis } from "@/forensic";
import { mapCaseRows } from "@/lib/case-mapper";

type Ctx = { getUserId?: () => string | undefined };

/**
 * Analýza posledného prípadu vlastníka tokenu. Bez prihláseného používateľa
 * alebo bez prípadu vracia prázdnu analýzu — žiadne demo dáta.
 */
export async function caseAnalysis(ctx?: Ctx): Promise<CaseAnalysis> {
  const userId = ctx?.getUserId?.();
  if (!userId) return analyzeCase(EMPTY_CASE);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row } = await supabaseAdmin
    .from("cases")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row) return analyzeCase(EMPTY_CASE);

  const caseId = row.id;
  const [entities, transactions, weapons, relations, events] = await Promise.all([
    supabaseAdmin.from("case_entities").select("*").eq("case_id", caseId).eq("user_id", userId),
    supabaseAdmin.from("case_transactions").select("*").eq("case_id", caseId).eq("user_id", userId),
    supabaseAdmin.from("case_weapons").select("*").eq("case_id", caseId).eq("user_id", userId),
    supabaseAdmin.from("case_relations").select("*").eq("case_id", caseId).eq("user_id", userId),
    supabaseAdmin.from("case_events").select("*").eq("case_id", caseId).eq("user_id", userId),
  ]);

  return analyzeCase(
    mapCaseRows(
      row,
      entities.data ?? [],
      transactions.data ?? [],
      weapons.data ?? [],
      relations.data ?? [],
      events.data ?? [],
    ),
  );
}

export function text(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
      },
    ],
  };
}
