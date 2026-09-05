import { supabase } from "@/integrations/supabase/client";
import type { ForensicCase } from "@/forensic";
import { mapCaseRows } from "@/lib/case-mapper";
import {
  deleteRecord,
  getDeleteImpact,
  saveCase,
  saveEntity,
  saveEvent,
  saveRelation,
  saveTransaction,
  saveWeapon,
} from "@/lib/case-write.functions";

export type CaseSummary = {
  id: string;
  name: string;
  subtitle: string;
  referenceDate: string;
  baseCurrency: string;
  createdAt: string;
};

/** Čítanie ide priamo cez klienta (RLS obmedzí dáta na prihláseného používateľa). */
export async function listCases(): Promise<CaseSummary[]> {
  const { data, error } = await supabase
    .from("cases")
    .select("id, name, subtitle, reference_date, base_currency, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    subtitle: row.subtitle ?? "",
    referenceDate: row.reference_date,
    baseCurrency: row.base_currency ?? "EUR",
    createdAt: row.created_at,
  }));
}

/** Načíta celý prípad a poskladá ho do tvaru, ktorý očakáva forenzné jadro. */
export async function loadCase(caseId: string): Promise<ForensicCase> {
  const [caseRow, entities, transactions, weapons, relations, events] = await Promise.all([
    supabase.from("cases").select("*").eq("id", caseId).maybeSingle(),
    supabase.from("case_entities").select("*").eq("case_id", caseId),
    supabase.from("case_transactions").select("*").eq("case_id", caseId),
    supabase.from("case_weapons").select("*").eq("case_id", caseId),
    supabase.from("case_relations").select("*").eq("case_id", caseId),
    supabase.from("case_events").select("*").eq("case_id", caseId),
  ]);

  const row = caseRow.data;
  if (!row) throw new Error("Prípad sa nenašiel.");

  return mapCaseRows(
    row,
    entities.data ?? [],
    transactions.data ?? [],
    weapons.data ?? [],
    relations.data ?? [],
    events.data ?? [],
  );
}

/** Revízie záznamov pre ochranu pred prepísaním súbežnou úpravou. */
export async function loadCaseRevisions(caseId: string): Promise<Record<string, number>> {
  const tables = [
    "cases",
    "case_entities",
    "case_transactions",
    "case_weapons",
    "case_relations",
    "case_events",
  ] as const;
  const results = await Promise.all(
    tables.map((table) =>
      table === "cases"
        ? supabase.from(table).select("id, revision").eq("id", caseId)
        : supabase.from(table).select("id, revision").eq("case_id", caseId),
    ),
  );
  const out: Record<string, number> = {};
  for (const result of results) {
    for (const row of result.data ?? []) {
      out[(row as { id: string }).id] = (row as { revision?: number }).revision ?? 1;
    }
  }
  return out;
}

/* Zápisy idú výhradne cez serverové funkcie so Zod validáciou. */
export const createCase = async (input: {
  name: string;
  subtitle?: string;
  referenceDate?: string;
  baseCurrency?: string;
}) => (await saveCase({ data: { ...input } })).id;

export const updateCase = saveCase;
export const upsertEntity = saveEntity;
export const upsertTransaction = saveTransaction;
export const upsertRelation = saveRelation;
export const upsertWeapon = saveWeapon;
export const upsertEvent = saveEvent;
export const describeDeleteImpact = getDeleteImpact;

export const deleteCase = async (id: string) => {
  await deleteRecord({ data: { type: "case", id } });
};
export const deleteEntity = async (id: string) => {
  await deleteRecord({ data: { type: "entity", id } });
};
export const deleteTransaction = async (id: string) => {
  await deleteRecord({ data: { type: "transaction", id } });
};
export const deleteRelation = async (id: string) => {
  await deleteRecord({ data: { type: "relation", id } });
};
export const deleteWeapon = async (id: string) => {
  await deleteRecord({ data: { type: "weapon", id } });
};
export const deleteEvent = async (id: string) => {
  await deleteRecord({ data: { type: "event", id } });
};
