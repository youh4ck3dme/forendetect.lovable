import type { LeadType } from "./leads";

export type LeadDecision = "new" | "follow" | "snooze" | "dismiss";

export const MIN_WEIGHT = 0.2;
export const MAX_WEIGHT = 2;
/** Pod touto hranicou sa stopa skryje pod „Zobraziť potlačené“. */
export const SUPPRESS_BELOW = 0.35;

/** Nová váha typu stopy po rozhodnutí používateľa. Hranice bránia úplnému umlčaniu. */
export function nextWeight(current: number, decision: LeadDecision): number {
  const base = Number.isFinite(current) ? current : 1;
  const delta =
    decision === "follow" ? 0.25 : decision === "dismiss" ? -0.25 : decision === "snooze" ? -0.05 : 0;
  return Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, Number((base + delta).toFixed(3))));
}

export function weightOf(weights: Partial<Record<LeadType, number>>, type: LeadType): number {
  const w = weights[type];
  return typeof w === "number" && Number.isFinite(w) ? w : 1;
}

/** Výsledné poradie = deterministické skóre × naučená váha typu. */
export function rankedScore(
  baseScore: number,
  leadType: LeadType,
  weights: Partial<Record<LeadType, number>>,
): number {
  return Number((baseScore * weightOf(weights, leadType)).toFixed(4));
}

export function isSuppressed(
  leadType: LeadType,
  weights: Partial<Record<LeadType, number>>,
): boolean {
  return weightOf(weights, leadType) < SUPPRESS_BELOW;
}

export function sortByLearnedScore<T extends { baseScore: number; leadType: LeadType; fingerprint: string }>(
  leads: T[],
  weights: Partial<Record<LeadType, number>>,
): T[] {
  return [...leads].sort((a, b) => {
    const diff = rankedScore(b.baseScore, b.leadType, weights) - rankedScore(a.baseScore, a.leadType, weights);
    return diff !== 0 ? diff : a.fingerprint.localeCompare(b.fingerprint);
  });
}
