import type { ForensicCase } from "@/forensic";

/** Typy stôp, ktoré agent hľadá deterministicky (bez AI). */
export const LEAD_TYPES = [
  "unclosed_flow",
  "missing_link",
  "isolated_entity",
  "time_cluster",
  "amount_pattern",
  "uncovered_finding",
  "data_gap",
] as const;

export type LeadType = (typeof LEAD_TYPES)[number];

export const LEAD_TYPE_LABEL: Record<LeadType, string> = {
  unclosed_flow: "Neuzavretý tok",
  missing_link: "Chýbajúci článok",
  isolated_entity: "Osamotená osoba",
  time_cluster: "Časový zhluk",
  amount_pattern: "Opakovaný vzor súm",
  uncovered_finding: "Nepokrytý nález",
  data_gap: "Medzera v dátach",
};

export type LeadRef = { type: "entity" | "transaction" | "finding"; id: string; label: string };

export type AgentLead = {
  fingerprint: string;
  leadType: LeadType;
  title: string;
  reason: string;
  baseScore: number;
  refs: LeadRef[];
  suggestedSteps: string[];
};

const DAY = 24 * 3600 * 1000;
const clamp = (n: number) => Math.max(0.05, Math.min(1, n));
const day = (iso: string) => new Date(`${iso}T00:00:00Z`).getTime();
const eur = (n: number) =>
  new Intl.NumberFormat("sk-SK", { maximumFractionDigits: 0 }).format(Math.round(n));

export type LeadInput = {
  forensicCase: ForensicCase;
  /** Identifikátory nálezov s vysokým rizikom z deterministických detektorov. */
  highRiskFindings?: Array<{ id: string; label: string; entityIds?: string[] }>;
};

/**
 * Deterministické generovanie stôp. Žiadna AI, žiadna náhodnosť — rovnaké dáta
 * vždy vyprodukujú rovnaké stopy s rovnakým fingerprintom.
 */
export function generateLeads(input: LeadInput): AgentLead[] {
  const c = input.forensicCase;
  const nameOf = (id: string) => c.entities.find((e) => e.id === id)?.name ?? id;
  const out: AgentLead[] = [];

  // 1) Neuzavretý tok: príjem a odoslanie podobnej sumy do 7 dní.
  for (const inTx of c.transactions) {
    for (const outTx of c.transactions) {
      if (inTx.id === outTx.id) continue;
      if (outTx.fromId !== inTx.toId) continue;
      if (outTx.toId === inTx.fromId) continue;
      const gap = day(outTx.date) - day(inTx.date);
      if (gap < 0 || gap > 7 * DAY) continue;
      const ratio = inTx.amount === 0 ? 0 : outTx.amount / inTx.amount;
      if (ratio < 0.8 || ratio > 1.05) continue;
      out.push({
        fingerprint: `unclosed_flow:${inTx.id}:${outTx.id}`,
        leadType: "unclosed_flow",
        title: `Prostriedky prechádzajú cez ${nameOf(inTx.toId)}`,
        reason: `${eur(inTx.amount)} ${inTx.currency} prišlo od ${nameOf(inTx.fromId)} (${inTx.date}) a do ${Math.round(gap / DAY)} dní odišlo ${eur(outTx.amount)} ${outTx.currency} k ${nameOf(outTx.toId)}.`,
        baseScore: clamp(0.6 + (ratio > 0.95 ? 0.2 : 0)),
        refs: [
          { type: "transaction", id: inTx.id, label: `Príjem ${inTx.date}` },
          { type: "transaction", id: outTx.id, label: `Odchod ${outTx.date}` },
          { type: "entity", id: inTx.toId, label: nameOf(inTx.toId) },
        ],
        suggestedSteps: [
          "Overiť ekonomický dôvod priechodu prostriedkov cez medzičlánok.",
          "Vyžiadať zmluvnú dokumentáciu k obom platbám.",
        ],
      });
    }
  }

  // 2) Chýbajúci článok: opakované toky medzi dvojicou bez zaznamenaného vzťahu.
  const pairVolume = new Map<string, { count: number; amount: number; a: string; b: string }>();
  for (const t of c.transactions) {
    const key = [t.fromId, t.toId].sort().join("|");
    const entry = pairVolume.get(key) ?? { count: 0, amount: 0, a: t.fromId, b: t.toId };
    entry.count += 1;
    entry.amount += t.amount;
    pairVolume.set(key, entry);
  }
  for (const [key, entry] of pairVolume) {
    if (entry.count < 2) continue;
    const linked = c.relations.some(
      (r) => [r.fromId, r.toId].sort().join("|") === key,
    );
    if (linked) continue;
    out.push({
      fingerprint: `missing_link:${key}`,
      leadType: "missing_link",
      title: `Toky bez zaznamenaného vzťahu: ${nameOf(entry.a)} — ${nameOf(entry.b)}`,
      reason: `${entry.count} transakcií v objeme ${eur(entry.amount)} bez evidovaného vzťahu medzi subjektmi.`,
      baseScore: clamp(0.4 + Math.min(0.4, entry.count * 0.05)),
      refs: [
        { type: "entity", id: entry.a, label: nameOf(entry.a) },
        { type: "entity", id: entry.b, label: nameOf(entry.b) },
      ],
      suggestedSteps: [
        "Doplniť alebo vyvrátiť vzťah medzi subjektmi v sekcii Vzťahy.",
        "Preveriť, či ide o obchodný vzťah so zmluvným podkladom.",
      ],
    });
  }

  // 3) Osamotená osoba: entita bez transakcií aj bez vzťahov.
  for (const e of c.entities) {
    const hasTx = c.transactions.some((t) => t.fromId === e.id || t.toId === e.id);
    const hasRel = c.relations.some((r) => r.fromId === e.id || r.toId === e.id);
    if (hasTx || hasRel) continue;
    out.push({
      fingerprint: `isolated_entity:${e.id}`,
      leadType: "isolated_entity",
      title: `${e.name} nemá žiadne prepojenie`,
      reason: "Subjekt je v prípade evidovaný, ale nemá transakcie ani vzťahy.",
      baseScore: 0.3,
      refs: [{ type: "entity", id: e.id, label: e.name }],
      suggestedSteps: [
        "Doplniť chýbajúce transakcie alebo vzťahy subjektu.",
        "Zvážiť, či subjekt do prípadu patrí.",
      ],
    });
  }

  // 4) Časový zhluk: 4 a viac transakcií v jednom dni.
  const byDate = new Map<string, string[]>();
  for (const t of c.transactions) {
    byDate.set(t.date, [...(byDate.get(t.date) ?? []), t.id]);
  }
  for (const [date, ids] of byDate) {
    if (ids.length < 4) continue;
    out.push({
      fingerprint: `time_cluster:${date}`,
      leadType: "time_cluster",
      title: `Zhluk ${ids.length} operácií dňa ${date}`,
      reason: `V jeden deň bolo zaznamenaných ${ids.length} transakcií.`,
      baseScore: clamp(0.35 + ids.length * 0.05),
      refs: ids.slice(0, 8).map((id) => ({ type: "transaction" as const, id, label: date })),
      suggestedSteps: [
        "Preveriť, čo sa v prípade udialo v daný deň.",
        "Porovnať zhluk s udalosťami v časovej osi.",
      ],
    });
  }

  // 5) Opakovaný vzor súm: rovnaká suma aspoň 3-krát.
  const byAmount = new Map<string, string[]>();
  for (const t of c.transactions) {
    const key = `${t.currency}:${Math.round(t.amount)}`;
    byAmount.set(key, [...(byAmount.get(key) ?? []), t.id]);
  }
  for (const [key, ids] of byAmount) {
    if (ids.length < 3) continue;
    const [currency, amount] = key.split(":");
    out.push({
      fingerprint: `amount_pattern:${key}`,
      leadType: "amount_pattern",
      title: `Opakovaná suma ${eur(Number(amount))} ${currency}`,
      reason: `Rovnaká suma sa v prípade opakuje ${ids.length}-krát.`,
      baseScore: clamp(0.4 + ids.length * 0.05),
      refs: ids.slice(0, 8).map((id) => ({ type: "transaction" as const, id, label: `${eur(Number(amount))} ${currency}` })),
      suggestedSteps: [
        "Overiť, či ide o pravidelnú platbu so zmluvným podkladom.",
        "Porovnať sumy s ohlasovacími prahmi.",
      ],
    });
  }

  // 6) Nepokrytý nález: rizikový nález bez nadväzujúceho kroku.
  for (const f of input.highRiskFindings ?? []) {
    out.push({
      fingerprint: `uncovered_finding:${f.id}`,
      leadType: "uncovered_finding",
      title: `Nález bez nadväznosti: ${f.label}`,
      reason: "Deterministický detektor označil vysoké riziko; k nálezu zatiaľ nie je zaznamenaný ďalší krok.",
      baseScore: 0.75,
      refs: [
        { type: "finding", id: f.id, label: f.label },
        ...(f.entityIds ?? []).map((id) => ({ type: "entity" as const, id, label: nameOf(id) })),
      ],
      suggestedSteps: [
        "Rozhodnúť, či sa nález stane samostatnou líniou vyšetrovania.",
        "Zaradiť nález do podkladov pre správu.",
      ],
    });
  }

  // 7) Medzera v dátach: viac ako 60 dní bez transakcie v inak súvislej sérii.
  const dates = [...new Set(c.transactions.map((t) => t.date))].sort();
  for (let i = 1; i < dates.length; i += 1) {
    const prev = dates[i - 1]!;
    const next = dates[i]!;
    const gapDays = Math.round((day(next) - day(prev)) / DAY);
    if (gapDays < 60) continue;
    out.push({
      fingerprint: `data_gap:${prev}:${next}`,
      leadType: "data_gap",
      title: `Medzera ${gapDays} dní v dátach`,
      reason: `Medzi ${prev} a ${next} nie je evidovaná žiadna transakcia.`,
      baseScore: clamp(0.3 + Math.min(0.3, gapDays / 365)),
      refs: [],
      suggestedSteps: [
        "Overiť, či pre toto obdobie existujú nedoimportované výpisy.",
        "Doplniť chýbajúce obdobie cez import CSV.",
      ],
    });
  }

  return out.sort((a, b) => b.baseScore - a.baseScore || a.fingerprint.localeCompare(b.fingerprint));
}
